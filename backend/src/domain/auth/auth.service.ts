import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { DeepPartial, FindOptionsWhere, In } from 'typeorm';
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
      acceptUserGroupsFromAuthProvider: configService.get('AUTH_USE_USER_GROUPS_FROM_AUTH_PROVIDER') === 'true',
      userGroupsPropertyName: configService.get('AUTH_USER_GROUPS_PROPERTY_NAME', 'groups'),
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
        req.session.user = user as User;
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
    await this.setupUserGroups();
    await this.setupAdmins();
  }

  private async setupAdmins() {
    const apiKey = this.configService.get<string>('AUTH_INITIALUSER_APIKEY');
    const email = this.configService.get<string>('AUTH_INITIAL_ADMIN_USERNAME');
    const password = this.configService.get<string>('AUTH_INITIAL_ADMIN_PASSWORD');
    const adminRoleRequired = this.configService.get<string>('AUTH_INITIAL_ADMIN_ROLE_REQUIRED') === 'true';

    if (!email || !password) {
      return;
    }

    const numberOfAdmins = await this.getNumberOfAdmins();
    if (numberOfAdmins > 0 && !adminRoleRequired) {
      return;
    }

    const userFromDb = await this.users.findOne({
      where: { email: email },
      relations: ['userGroups'],
    });

    if (userFromDb) {
      userFromDb.userGroups = [{ id: BUILTIN_USER_GROUP_ADMIN } as UserGroupEntity];
      userFromDb.passwordHash ||= await bcrypt.hash(password, 10);
      userFromDb.apiKey ||= apiKey;

      await this.users.save(userFromDb);

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

  private async setupUserGroups() {
    const numberOfGroups = await this.userGroups.count();

    if (numberOfGroups > 0) {
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

    const userDoesNotExist = !fromDB;
    if (userDoesNotExist) {
      const userGroups = this.config.acceptUserGroupsFromAuthProvider
        ? await this.getUserGroupsOfUser(user)
        : await this.defineGroupsForNewUser();
      fromDB = await this.saveAndReloadUser({ ...user, userGroups }, userFilter);
    } else if (this.config.acceptUserGroupsFromAuthProvider) {
      const userGroups = await this.getUserGroupsOfUser(user);
      // The groups from the auth provider override the existing groups. They can be empty.
      fromDB = await this.saveAndReloadUser({ ...user, userGroups }, userFilter);
    }

    await this.setSessionUser(req, fromDB ?? undefined);
  }

  private async getUserGroupsOfUser(user: User) {
    const ids = user.userGroupIds;
    if (!Array.isArray(ids) || ids.length === 0) {
      return [];
    }
    return await this.userGroups.findBy({ name: In(ids) });
  }

  private async defineGroupsForNewUser() {
    const thereIsNoAdmin = (await this.getNumberOfAdmins()) === 0;
    // If no admin has been created yet, the new user must have the built-in admin group.
    const mandatoryGroupId = thereIsNoAdmin ? BUILTIN_USER_GROUP_ADMIN : BUILTIN_USER_GROUP_DEFAULT;
    const mandatoryGroup = (await this.userGroups.findOneBy({ id: mandatoryGroupId }))!;
    this.logger.log('mandatory group', mandatoryGroup);
    return [mandatoryGroup];
  }

  private async saveAndReloadUser(user: DeepPartial<UserEntity>, userFilter: FindOptionsWhere<UserEntity>) {
    await this.users.save(user);
    // Reload the user again to get the default values from the database.
    return await this.users.findOne({ where: userFilter, relations: ['userGroups'] });
  }

  private async getNumberOfAdmins() {
    return await this.users
      .createQueryBuilder('user')
      .leftJoin('user.userGroups', 'userGroup')
      .where('userGroup.id = :adminId', { adminId: BUILTIN_USER_GROUP_ADMIN })
      .getCount();
  }
}
