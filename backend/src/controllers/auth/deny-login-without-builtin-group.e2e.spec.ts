/**
 * E2E tests for the "deny login without allowed user group" security rule.
 *
 * Two code paths enforce this rule:
 *  1. POST /auth/login  (password auth)
 *     authService.loginWithPassword() → assertHasAllowedGroup() throws ForbiddenException
 *     → NestJS converts that to HTTP 403.
 *
 *  2. GET /auth/login/<provider>/callback  (OAuth / SSO auth)
 *     loginAndRedirect() catches ForbiddenException from authService.login()
 *     → redirects to /login?error=forbidden.
 *
 * For path 2 we cannot drive a real OAuth handshake in a unit-level e2e test, so we
 * override the relevant Passport guard with one that unconditionally injects a test
 * user into req.user (bypassing the external IdP round-trip) and verify that the
 * controller's error-handling redirect fires correctly when the injected user has no
 * built-in group.
 */

import { CanActivate, ExecutionContext, ForbiddenException, HttpStatus } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import * as uuid from 'uuid';
import { AppModule } from '../../app.module';
import { configureCookies, configureSession } from '../../config';
import { AuthService, GithubAuthGuard, GoogleAuthGuard, MicrosoftAuthGuard, OAuthAuthGuard } from '../../domain/auth';
import { BUILTIN_USER_GROUP_ADMIN, BUILTIN_USER_GROUP_DEFAULT, UserEntity, UserGroupEntity } from '../../domain/database';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PASSWORD = 'Password1!';

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

/** Seeds the two built-in groups plus a user that belongs to NEITHER of them. */
async function seedForbiddenUser(dataSource: DataSource): Promise<{ email: string; password: string }> {
  const userGroupRepo = dataSource.getRepository(UserGroupEntity);
  const userRepo = dataSource.getRepository(UserEntity);

  // Ensure built-in groups exist (onModuleInit may have already created them, but
  // save() with an existing PK is idempotent thanks to upsert semantics in TypeORM).
  const adminGroup = userGroupRepo.create({
    id: BUILTIN_USER_GROUP_ADMIN,
    name: 'Admin',
    isAdmin: true,
    isBuiltIn: true,
  });
  const defaultGroup = userGroupRepo.create({
    id: BUILTIN_USER_GROUP_DEFAULT,
    name: 'Default',
    isAdmin: false,
    isBuiltIn: true,
  });
  await userGroupRepo.save([adminGroup, defaultGroup]);

  // A completely custom group that is NOT a built-in system group.
  const externalGroup = userGroupRepo.create({
    id: uuid.v4(),
    name: 'external-only',
    isAdmin: false,
    isBuiltIn: false,
  });
  await userGroupRepo.save(externalGroup);

  const email = `forbidden-${uuid.v4()}@example.com`;
  const forbiddenUser = userRepo.create({
    id: uuid.v4(),
    name: 'Forbidden User',
    email,
    passwordHash: await hashPassword(PASSWORD),
    userGroups: [externalGroup],
  });
  await userRepo.save(forbiddenUser);

  return { email, password: PASSWORD };
}

/** Seeds a user that belongs to the built-in Default group. */
async function seedAllowedUser(dataSource: DataSource): Promise<{ email: string; password: string }> {
  const userGroupRepo = dataSource.getRepository(UserGroupEntity);
  const userRepo = dataSource.getRepository(UserEntity);

  const defaultGroup = userGroupRepo.create({
    id: BUILTIN_USER_GROUP_DEFAULT,
    name: 'Default',
    isAdmin: false,
    isBuiltIn: true,
  });
  await userGroupRepo.save(defaultGroup);

  const email = `allowed-${uuid.v4()}@example.com`;
  const allowedUser = userRepo.create({
    id: uuid.v4(),
    name: 'Allowed User',
    email,
    passwordHash: await hashPassword(PASSWORD),
    userGroups: [defaultGroup],
  });
  await userRepo.save(allowedUser);

  return { email, password: PASSWORD };
}

// Stable identity for the forbidden OAuth user — must match between the guard
// stub and the seeded DB record so that saveAndReloadUser() does an UPDATE,
// not an INSERT (which would fail on the unique email constraint).
const OAUTH_FORBIDDEN_EMAIL = 'oauth-forbidden@example.com';
const OAUTH_FORBIDDEN_ID = 'oauth-forbidden-fixed-id-000000000000';

// ---------------------------------------------------------------------------
// A minimal Passport-guard stub that places a pre-built user profile on
// req.user so that the controller's loginAndRedirect() is exercised without
// needing a real OAuth round-trip.  The injected profile intentionally has no
// built-in group, so authService.login() will throw ForbiddenException.
// ---------------------------------------------------------------------------
class ForbiddenOAuthGuardStub implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Record<string, unknown>>();
    req.user = {
      id: OAUTH_FORBIDDEN_ID,
      email: OAUTH_FORBIDDEN_EMAIL,
      name: 'OAuth Forbidden',
      userGroupIds: [], // IdP sends no groups → real login() will clear DB groups → ForbiddenException
    };
    return true;
  }
}

// ---------------------------------------------------------------------------
// A guard stub for the "allowed" path: injects a user that will successfully
// pass through login when AUTH_LOGIN_ALLOWED_GROUPS is empty.
// ---------------------------------------------------------------------------
class AllowedOAuthGuardStub implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Record<string, unknown>>();
    req.user = {
      id: `oauth-allowed-${uuid.v4()}`,
      email: `oauth-allowed@example.com`,
      name: 'OAuth Allowed',
      userGroupIds: [],
    };
    return true;
  }
}

// ---------------------------------------------------------------------------
// A guard stub for the "built-in group" OAuth path: injects a user whose
// userGroupIds contains the Default built-in group, so authService.login()
// should succeed when AUTH_LOGIN_ALLOWED_GROUPS is configured.
// ---------------------------------------------------------------------------
class BuiltInGroupOAuthGuardStub implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Record<string, unknown>>();
    req.user = {
      id: `oauth-builtin-${uuid.v4()}`,
      email: `oauth-builtin@example.com`,
      name: 'OAuth BuiltIn',
      userGroupIds: [BUILTIN_USER_GROUP_DEFAULT],
    };
    return true;
  }
}

/**
 * Seeds a pre-existing user that initially belongs to the external-only group.
 * When acceptUserGroupsFromAuthProvider=true, the IdP groups will overwrite
 * that initial assignment on the next login.
 */
async function seedExistingUser(
  dataSource: DataSource,
): Promise<{ id: string; email: string; defaultGroupName: string; externalGroupName: string }> {
  const userGroupRepo = dataSource.getRepository(UserGroupEntity);
  const userRepo = dataSource.getRepository(UserEntity);

  // Ensure built-in groups exist.
  const adminGroup = userGroupRepo.create({ id: BUILTIN_USER_GROUP_ADMIN, name: 'Admin', isAdmin: true, isBuiltIn: true });
  const defaultGroup = userGroupRepo.create({ id: BUILTIN_USER_GROUP_DEFAULT, name: 'Default', isAdmin: false, isBuiltIn: true });
  await userGroupRepo.save([adminGroup, defaultGroup]);

  // A non-built-in group the user starts with (will be overwritten by IdP groups).
  const externalGroupName = `external-${uuid.v4()}`;
  const externalGroup = userGroupRepo.create({ id: uuid.v4(), name: externalGroupName, isAdmin: false, isBuiltIn: false });
  await userGroupRepo.save(externalGroup);

  const id = uuid.v4();
  const email = `existing-${uuid.v4()}@example.com`;
  const user = userRepo.create({
    id,
    name: 'Existing User',
    email,
    passwordHash: await hashPassword(PASSWORD),
    userGroups: [externalGroup],
  });
  await userRepo.save(user);

  return { id, email, defaultGroupName: defaultGroup.name, externalGroupName };
}

/**
 * Seeds a DB user whose email matches the ForbiddenOAuthGuardStub's static email.
 * This ensures login() takes the "existing user" path and overwrites their groups
 * with the empty list sent by the IdP stub, causing ForbiddenException.
 */
async function seedOAuthForbiddenUser(dataSource: DataSource): Promise<void> {
  const userGroupRepo = dataSource.getRepository(UserGroupEntity);
  const userRepo = dataSource.getRepository(UserEntity);

  const externalGroup = userGroupRepo.create({
    id: uuid.v4(),
    name: `oauth-external-${uuid.v4()}`,
    isAdmin: false,
    isBuiltIn: false,
  });
  await userGroupRepo.save(externalGroup);

  const existing = await userRepo.findOneBy({ email: OAUTH_FORBIDDEN_EMAIL });
  if (!existing) {
    const user = userRepo.create({
      id: OAUTH_FORBIDDEN_ID,
      name: 'OAuth Forbidden',
      email: OAUTH_FORBIDDEN_EMAIL,
      userGroups: [externalGroup],
    });
    await userRepo.save(user);
  }
}

/** Removes all non-built-in user groups and non-built-in users seeded during tests. */
async function cleanupNonBuiltInData(dataSource: DataSource): Promise<void> {
  const userRepo = dataSource.getRepository(UserEntity);
  const userGroupRepo = dataSource.getRepository(UserGroupEntity);

  // Delete all users that do not belong to any built-in group (test users).
  const allUsers = await userRepo.find({ relations: ['userGroups'] });
  const testUsers = allUsers.filter((u) => !u.userGroups.some((g) => g.isBuiltIn));
  if (testUsers.length > 0) {
    await userRepo.remove(testUsers);
  }

  // Delete all non-built-in groups.
  const nonBuiltInGroups = await userGroupRepo.findBy({ isBuiltIn: false });
  if (nonBuiltInGroups.length > 0) {
    await userGroupRepo.remove(nonBuiltInGroups);
  }
}

describe('acceptUserGroupsFromAuthProvider: groups from IdP overwrite DB groups for existing user', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    process.env['AUTH_LOGIN_ALLOWED_GROUPS'] = 'Admin,Default';
    process.env['AUTH_USE_USER_GROUPS_FROM_AUTH_PROVIDER'] = 'true';

    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    dataSource = module.get<DataSource>(getDataSourceToken());
    app = module.createNestApplication<NestExpressApplication>();
    configureSession(app);
    configureCookies(app);
    await app.init();
  }, 60_000);

  afterAll(async () => {
    delete process.env['AUTH_LOGIN_ALLOWED_GROUPS'];
    delete process.env['AUTH_USE_USER_GROUPS_FROM_AUTH_PROVIDER'];
    await cleanupNonBuiltInData(dataSource);
    await dataSource.destroy();
    await app.close();
  }, 30_000);

  // -------------------------------------------------------------------------
  // When the IdP provides a group name that matches the built-in Default group,
  // that group is written to the DB and the user passes the allowed-groups check.
  // -------------------------------------------------------------------------
  it('allows login when IdP provides a built-in group name for an existing user', async () => {
    const { id, email, defaultGroupName } = await seedExistingUser(dataSource);

    const authService = app.get(AuthService);
    const loginSpy = jest.spyOn(authService, 'login');

    const fakeUser = {
      id, // must match the DB record so saveAndReloadUser does an UPDATE, not an INSERT
      email,
      name: 'Existing User',
      userGroupIds: [defaultGroupName], // IdP sends the Default group by name
    };
    const fakeReq = { session: { save: (cb: () => void) => cb(), user: undefined } } as unknown as Request;

    await expect(authService.login(fakeUser, fakeReq)).resolves.not.toThrow();
    expect(loginSpy).toHaveBeenCalled();

    // The user's groups in the DB must now be the Default group only.
    const userRepo = dataSource.getRepository(UserEntity);
    const saved = await userRepo.findOne({ where: { email }, relations: ['userGroups'] });
    expect(saved?.userGroups.map((g) => g.name)).toContain(defaultGroupName);

    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // When the IdP provides no groups for an existing user, the DB groups are
  // cleared (overwritten with an empty list) and the allowed-groups check
  // throws ForbiddenException.
  // -------------------------------------------------------------------------
  it('denies login when IdP provides no groups for an existing user', async () => {
    const { id, email } = await seedExistingUser(dataSource);

    const authService = app.get(AuthService);

    const fakeUser = {
      id, // must match the DB record so saveAndReloadUser does an UPDATE, not an INSERT
      email,
      name: 'Existing User',
      userGroupIds: [], // IdP sends no groups → DB groups will be cleared
    };
    const fakeReq = { session: { destroy: (cb: () => void) => cb(), save: (cb: () => void) => cb() } } as unknown as Request;

    await expect(authService.login(fakeUser, fakeReq)).rejects.toThrow(ForbiddenException);

    // The user's groups in the DB must have been cleared.
    const userRepo = dataSource.getRepository(UserEntity);
    const saved = await userRepo.findOne({ where: { email }, relations: ['userGroups'] });
    expect(saved?.userGroups).toHaveLength(0);
  });
});

describe('Allow login when AUTH_LOGIN_ALLOWED_GROUPS is empty', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let allowedEmail: string;
  let allowedPassword: string;

  beforeAll(async () => {
    // Explicitly unset the env var so that no group restriction is applied.
    delete process.env['AUTH_LOGIN_ALLOWED_GROUPS'];

    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(GithubAuthGuard)
      .useClass(AllowedOAuthGuardStub)
      .overrideGuard(GoogleAuthGuard)
      .useClass(AllowedOAuthGuardStub)
      .overrideGuard(MicrosoftAuthGuard)
      .useClass(AllowedOAuthGuardStub)
      .overrideGuard(OAuthAuthGuard)
      .useClass(AllowedOAuthGuardStub)
      .compile();

    dataSource = module.get<DataSource>(getDataSourceToken());
    app = module.createNestApplication<NestExpressApplication>();
    configureSession(app);
    configureCookies(app);
    await app.init();

    const seeded = await seedForbiddenUser(dataSource);
    allowedEmail = seeded.email;
    allowedPassword = seeded.password;
  }, 60_000);

  afterAll(async () => {
    await cleanupNonBuiltInData(dataSource);
    await dataSource.destroy();
    await app.close();
  }, 30_000);

  // -------------------------------------------------------------------------
  // Path 1 — POST /auth/login (password auth)
  // With no allowed-groups restriction the user without a built-in group
  // must be able to log in (i.e. NOT receive a 403).
  // -------------------------------------------------------------------------
  describe('POST /auth/login — password authentication', () => {
    it('allows login for a user with no built-in group when AUTH_LOGIN_ALLOWED_GROUPS is empty', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: allowedEmail, password: allowedPassword })
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(HttpStatus.OK);
          expect(res.status).toBeLessThan(HttpStatus.BAD_REQUEST);
        });
    });
  });

  // -------------------------------------------------------------------------
  // Path 2 — OAuth callback handlers
  // With no allowed-groups restriction the controller must redirect to the
  // application (i.e. NOT to /login?error=forbidden).
  // -------------------------------------------------------------------------
  describe('GET /auth/login/<provider>/callback — OAuth callbacks', () => {
    const oauthCallbacks = [
      { provider: 'github', path: '/auth/login/github/callback' },
      { provider: 'google', path: '/auth/login/google/callback' },
      { provider: 'microsoft', path: '/auth/login/microsoft/callback' },
      { provider: 'oauth', path: '/auth/login/oauth/callback' },
    ];

    it.each(oauthCallbacks)(
      'does NOT redirect to /login?error=forbidden for $provider callback when AUTH_LOGIN_ALLOWED_GROUPS is empty',
      async ({ path }) => {
        const response = await request(app.getHttpServer()).get(path).expect(HttpStatus.FOUND); // 302 redirect

        expect(response.headers['location']).not.toBe('/login?error=forbidden');
      },
    );
  });
});

describe('Allow login with a built-in group', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let builtInEmail: string;
  let builtInPassword: string;

  beforeAll(async () => {
    // Set BEFORE compile() — AuthService reads this in its constructor.
    process.env['AUTH_LOGIN_ALLOWED_GROUPS'] = 'Admin,Default';

    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(GithubAuthGuard)
      .useClass(BuiltInGroupOAuthGuardStub)
      .overrideGuard(GoogleAuthGuard)
      .useClass(BuiltInGroupOAuthGuardStub)
      .overrideGuard(MicrosoftAuthGuard)
      .useClass(BuiltInGroupOAuthGuardStub)
      .overrideGuard(OAuthAuthGuard)
      .useClass(BuiltInGroupOAuthGuardStub)
      .compile();

    dataSource = module.get<DataSource>(getDataSourceToken());
    app = module.createNestApplication<NestExpressApplication>();
    configureSession(app);
    configureCookies(app);
    await app.init();

    const seeded = await seedAllowedUser(dataSource);
    builtInEmail = seeded.email;
    builtInPassword = seeded.password;
  }, 60_000);

  afterAll(async () => {
    delete process.env['AUTH_LOGIN_ALLOWED_GROUPS'];
    await cleanupNonBuiltInData(dataSource);
    await dataSource.destroy();
    await app.close();
  }, 30_000);

  // -------------------------------------------------------------------------
  // Path 1 — POST /auth/login (password auth)
  // A user that belongs to the Default built-in group must be allowed to log in
  // even when AUTH_LOGIN_ALLOWED_GROUPS restricts access.
  // -------------------------------------------------------------------------
  describe('POST /auth/login — password authentication', () => {
    it('allows login for a user that belongs to a built-in group', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: builtInEmail, password: builtInPassword })
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(HttpStatus.OK);
          expect(res.status).toBeLessThan(HttpStatus.BAD_REQUEST);
        });
    });
  });

  // -------------------------------------------------------------------------
  // Path 2 — OAuth callback handlers
  // A user with a built-in group must be redirected to the application,
  // not to /login?error=forbidden.
  // -------------------------------------------------------------------------
  describe('GET /auth/login/<provider>/callback — OAuth callbacks', () => {
    const oauthCallbacks = [
      { provider: 'github', path: '/auth/login/github/callback' },
      { provider: 'google', path: '/auth/login/google/callback' },
      { provider: 'microsoft', path: '/auth/login/microsoft/callback' },
      { provider: 'oauth', path: '/auth/login/oauth/callback' },
    ];

    it.each(oauthCallbacks)(
      'does NOT redirect to /login?error=forbidden for $provider callback when user has a built-in group',
      async ({ path }) => {
        const response = await request(app.getHttpServer()).get(path).expect(HttpStatus.FOUND); // 302 redirect

        expect(response.headers['location']).not.toBe('/login?error=forbidden');
      },
    );
  });
});

describe('Deny login without built-in group', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let forbiddenEmail: string;
  let forbiddenPassword: string;

  beforeAll(async () => {
    // Set BEFORE compile() — AuthService reads this in its constructor.
    // Also enable acceptUserGroupsFromAuthProvider so that the real login()
    // overwrites the DB groups with the empty list from the stub and then throws
    // ForbiddenException because the user no longer has an allowed group.
    process.env['AUTH_LOGIN_ALLOWED_GROUPS'] = 'Admin,Default';
    process.env['AUTH_USE_USER_GROUPS_FROM_AUTH_PROVIDER'] = 'true';

    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Replace all OAuth guards with the stub so we can test the callback
      // handler without a real IdP.
      .overrideGuard(GithubAuthGuard)
      .useClass(ForbiddenOAuthGuardStub)
      .overrideGuard(GoogleAuthGuard)
      .useClass(ForbiddenOAuthGuardStub)
      .overrideGuard(MicrosoftAuthGuard)
      .useClass(ForbiddenOAuthGuardStub)
      .overrideGuard(OAuthAuthGuard)
      .useClass(ForbiddenOAuthGuardStub)
      .compile();

    dataSource = module.get<DataSource>(getDataSourceToken());
    app = module.createNestApplication<NestExpressApplication>();
    configureSession(app);
    configureCookies(app);
    await app.init();

    // Seed the forbidden user for password-auth tests.
    const seeded = await seedForbiddenUser(dataSource);
    forbiddenEmail = seeded.email;
    forbiddenPassword = seeded.password;

    // Seed a DB user whose email matches the ForbiddenOAuthGuardStub so that
    // login() takes the "existing user" code path and overwrites their groups
    // with the empty list from the IdP, triggering ForbiddenException.
    await seedOAuthForbiddenUser(dataSource);
  }, 60_000);

  afterAll(async () => {
    delete process.env['AUTH_LOGIN_ALLOWED_GROUPS'];
    delete process.env['AUTH_USE_USER_GROUPS_FROM_AUTH_PROVIDER'];
    await cleanupNonBuiltInData(dataSource);
    await dataSource.destroy();
    await app.close();
  }, 30_000);

  // -------------------------------------------------------------------------
  // Path 1 — POST /auth/login (password auth)
  // -------------------------------------------------------------------------
  describe('POST /auth/login — password authentication', () => {
    it('returns 403 when the user has no built-in group', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: forbiddenEmail, password: forbiddenPassword })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('returns 401 for completely unknown credentials (sanity check)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'wrong' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  // -------------------------------------------------------------------------
  // Path 2 — OAuth callback handlers
  // Each provider's callback goes through loginAndRedirect() which catches
  // ForbiddenException and redirects to /login?error=forbidden.
  // -------------------------------------------------------------------------
  describe('GET /auth/login/<provider>/callback — OAuth callbacks', () => {
    const oauthCallbacks = [
      { provider: 'github', path: '/auth/login/github/callback' },
      { provider: 'google', path: '/auth/login/google/callback' },
      { provider: 'microsoft', path: '/auth/login/microsoft/callback' },
      { provider: 'oauth', path: '/auth/login/oauth/callback' },
    ];

    it.each(oauthCallbacks)(
      'redirects to /login?error=forbidden for $provider callback when user has no built-in group',
      async ({ path }) => {
        const response = await request(app.getHttpServer()).get(path).expect(HttpStatus.FOUND); // 302 redirect

        expect(response.headers['location']).toBe('/login?error=forbidden');
      },
    );
  });
});
