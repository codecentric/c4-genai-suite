import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import * as uuid from 'uuid';
import {
  BUILTIN_USER_GROUP_ADMIN,
  BUILTIN_USER_GROUP_DEFAULT,
  UserEntity,
  UserGroupEntity,
  UserGroupRepository,
  UserRepository,
} from '../database';
import { User } from '../users';
import { AuthConfig } from './interfaces';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  public readonly config: Readonly<AuthConfig>;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly users: UserRepository,
    @InjectRepository(UserGroupEntity)
    private readonly userGroups: UserGroupRepository,
  ) {
    const config: AuthConfig = {
      baseUrl: configService.get('AUTH_BASEURL') || configService.getOrThrow('BASE_URL'),
      trustProxy: configService.get('AUTH_TRUST_PROXY') === 'true',
    };

    this.configureGithub(configService, config);
    this.configureGoogle(configService, config);
    this.configureMicrosoft(configService, config);
    this.configureOAuth2(configService, config);
    config.enablePassword = configService.get('AUTH_ENABLE_PASSWORD') === 'true';

    this.config = config;
  }

  private async setSessionUser(req: Request, user: User | UserEntity | undefined) {
    await new Promise((resolve) => {
      if (!user) {
        req.session.destroy(resolve);
      } else {
        let sessionUser: User;
        if ('userGroups' in user && Array.isArray(user.userGroups)) {
          sessionUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            userGroupIds: user.userGroups.map((g) => g.id),
          };
          if ('picture' in user && typeof user.picture === 'string') sessionUser.picture = user.picture;
          if ('hasPassword' in user && typeof user.hasPassword === 'boolean') sessionUser.hasPassword = user.hasPassword;
          if ('hasApiKey' in user && typeof user.hasApiKey === 'boolean') sessionUser.hasApiKey = user.hasApiKey;
        } else {
          sessionUser = user as User;
        }
        req.session.user = sessionUser;
        req.session.save(resolve);
      }
    });
  }

  private configureGithub(configService: ConfigService, config: AuthConfig) {
    const clientId = configService.get<string>('AUTH_GITHUB_CLIENTID');
    const clientSecret = configService.get<string>('AUTH_GITHUB_CLIENTSECRET');

    if (clientId && clientSecret) {
      config.github = {
        clientId,
        clientSecret,
      };
    }
  }

  private configureGoogle(configService: ConfigService, config: AuthConfig) {
    const clientId = configService.get<string>('AUTH_GOOGLE_CLIENTID');
    const clientSecret = configService.get<string>('AUTH_GOOGLE_CLIENTSECRET');

    if (clientId && clientSecret) {
      config.google = {
        clientId,
        clientSecret,
      };
    }
  }

  private configureMicrosoft(configService: ConfigService, config: AuthConfig) {
    const clientId = configService.get<string>('AUTH_MICROSOFT_CLIENTID');
    const clientSecret = configService.get<string>('AUTH_MICROSOFT_CLIENTSECRET');
    const tenant = configService.get<string>('AUTH_MICROSOFT_TENANT');

    if (clientId && clientSecret) {
      config.microsoft = {
        clientId,
        clientSecret,
        tenant,
      };
    }
  }

  private configureOAuth2(configService: ConfigService, config: AuthConfig) {
    const authorizationURL = configService.get<string>('AUTH_OAUTH_AUTHORIZATION_URL');
    const brandColor = configService.get<string>('AUTH_OAUTH_BRAND_COLOR');
    const brandName = configService.get<string>('AUTH_OAUTH_BRAND_NAME');
    const clientId = configService.get<string>('AUTH_OAUTH_CLIENTID');
    const clientSecret = configService.get<string>('AUTH_OAUTH_CLIENTSECRET');
    const tokenURL = configService.get<string>('AUTH_OAUTH_TOKEN_URL');
    const userInfoURL = configService.get<string>('AUTH_OAUTH_USER_INFO_URL');

    if (authorizationURL && clientId && clientSecret && tokenURL && userInfoURL) {
      config.oauth = {
        authorizationURL,
        brandColor,
        brandName,
        clientId,
        clientSecret,
        tokenURL,
        userInfoURL,
      };
    }
  }

  async onModuleInit(): Promise<any> {
    await this.setupUsers();
    await this.setupAdmins();
  }

  private async setupAdmins() {
    const email = this.configService.get<string>('AUTH_INITIAL_ADMIN_USERNAME');
    const apiKey = this.configService.get<string>('AUTH_INITIALUSER_APIKEY');
    const password = this.configService.get<string>('AUTH_INITIAL_ADMIN_PASSWORD');
    const adminRoleRequired = this.configService.get<string>('AUTH_INITIAL_ADMIN_ROLE_REQUIRED') === 'true';

    if (!email || !password) {
      return;
    }

    // Count users in admin group using join table
    const count = await this.users
      .createQueryBuilder('user')
      .leftJoin('user.userGroups', 'userGroup')
      .where('userGroup.id = :adminId', { adminId: BUILTIN_USER_GROUP_ADMIN })
      .getCount();

    // If no admin has been created yet, the first user becomes the admin.
    if (count > 0 && !adminRoleRequired) {
      return;
    }

    const existing = await this.users.findOne({
      where: { email: email },
      relations: ['userGroups'],
    });

    if (existing) {
      existing.userGroups = [{ id: BUILTIN_USER_GROUP_ADMIN } as UserGroupEntity];
      existing.passwordHash ||= await bcrypt.hash(password, 10);
      existing.apiKey ||= apiKey;

      await this.users.save(existing);

      this.logger.log(`Created user with email '${email}'.`);
    } else {
      await this.users.save({
        id: uuid.v4(),
        apiKey,
        email,
        name: email,
        passwordHash: await bcrypt.hash(password, 10),
        userGroups: [{ id: BUILTIN_USER_GROUP_ADMIN } as UserGroupEntity],
      });

      this.logger.log(`Created initial user with email '${email}'.`);
    }
  }

  private async setupUsers() {
    const count = await this.userGroups.count();

    if (count > 0) {
      return;
    }

    await this.userGroups.save([
      {
        id: BUILTIN_USER_GROUP_ADMIN,
        name: 'Admin',
        isAdmin: true,
        isBuiltIn: true,
      },
      {
        id: BUILTIN_USER_GROUP_DEFAULT,
        name: 'Default',
        isAdmin: false,
        isBuiltIn: true,
      },
    ]);
  }

  async logout(req: Request) {
    await this.setSessionUser(req, undefined);
  }

  async loginWithPassword(email: string, password: string, req: Request) {
    const user = await this.users.findOneBy({ email });

    // We cannot compare the password in the database due to the salt.
    if (!user?.passwordHash) {
      throw new BadRequestException('Unknown user.');
    }

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new BadRequestException('Wrong password.');
    }

    await this.setSessionUser(req, user);
  }

  async login(user: User, req: Request) {
    const userFilter = user.email ? { email: user.email } : { id: user.id };
    // Check if the user exist in the database.
    let fromDB = await this.users.findOne({ where: userFilter, relations: ['userGroups'] });

    if (!fromDB) {
      // Count users in admin group using join table
      const countAdmins = await this.users
        .createQueryBuilder('user')
        .leftJoin('user.userGroups', 'userGroup')
        .where('userGroup.id = :adminId', { adminId: BUILTIN_USER_GROUP_ADMIN })
        .getCount();

      // If no admin has been created yet, the first user becomes the admin.
      const groupId = countAdmins === 0 ? BUILTIN_USER_GROUP_ADMIN : BUILTIN_USER_GROUP_DEFAULT;
      user.userGroupIds = [groupId];
      // Save user with userGroups relation
      await this.users.save({ ...user, userGroups: user.userGroupIds.map((id) => ({ id }) as UserGroupEntity) });

      // Reload the user again to get the default values from the database.
      fromDB = await this.users.findOne({ where: userFilter, relations: ['userGroups'] });
    }

    await this.setSessionUser(req, fromDB ?? undefined);
  }
}
