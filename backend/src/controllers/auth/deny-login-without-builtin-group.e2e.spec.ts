/**
 * E2E tests for the "deny login without Default/Admin group" security rule.
 *
 * Two code paths enforce this rule:
 *  1. POST /auth/login  (password auth)
 *     authService.loginWithPassword() → assertHasSystemGroup() throws ForbiddenException
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

import { Server } from 'net';
import { CanActivate, ExecutionContext, ForbiddenException, HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import * as uuid from 'uuid';
import { AppModule } from '../../app.module';
import { GithubAuthGuard, GoogleAuthGuard, MicrosoftAuthGuard, OAuthAuthGuard } from '../../domain/auth';
import { AuthService } from '../../domain/auth';
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
      id: `oauth-forbidden-${uuid.v4()}`,
      email: `oauth-forbidden@example.com`,
      name: 'OAuth Forbidden',
      userGroupIds: [],
    };
    return true;
  }
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('Deny login without built-in group', () => {
  let app: INestApplication<Server>;
  let dataSource: DataSource;
  let forbiddenEmail: string;
  let forbiddenPassword: string;

  beforeAll(async () => {
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
    app = module.createNestApplication();
    await app.init();

    // Override authService.login so that any user injected by the stub guard
    // triggers a ForbiddenException, simulating the "no built-in group" path.
    const authService = app.get(AuthService);
    jest
      .spyOn(authService, 'login')
      .mockRejectedValue(new ForbiddenException('User is not a member of any system group and is not allowed to log in.'));

    const seeded = await seedForbiddenUser(dataSource);
    forbiddenEmail = seeded.email;
    forbiddenPassword = seeded.password;
  }, 60_000);

  afterAll(async () => {
    jest.restoreAllMocks();
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
