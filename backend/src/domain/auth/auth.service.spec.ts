import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BUILTIN_USER_GROUP_DEFAULT, UserEntity, UserGroupEntity } from '../database';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  function createMockUserRepository() {
    return {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockImplementation((data: Record<string, unknown>) => data),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      }),
      count: jest.fn().mockResolvedValue(0),
    };
  }

  function createMockUserGroupRepository() {
    return {
      count: jest.fn().mockResolvedValue(1), // skip setupUserGroups
      save: jest.fn().mockResolvedValue({}),
      findOneBy: jest.fn().mockResolvedValue({ id: BUILTIN_USER_GROUP_DEFAULT, name: 'Default' }),
      findBy: jest.fn().mockResolvedValue([]),
    };
  }

  function createConfigMap(overrides: Record<string, string | undefined> = {}) {
    const defaults: Record<string, string | undefined> = {
      BASE_URL: 'http://localhost',
      AUTH_TRUST_PROXY: 'false',
      AUTH_USE_USER_GROUPS_FROM_AUTH_PROVIDER: 'false',
      AUTH_LOGIN_ALLOWED_GROUPS: '',
      AUTH_USER_GROUPS_PROPERTY_NAME: 'groups',
      AUTH_ENABLE_PASSWORD: 'false',
      // No initial admin by default
      AUTH_INITIALUSER_APIKEY: undefined,
      AUTH_INITIAL_ADMIN_USERNAME: undefined,
      AUTH_INITIAL_ADMIN_PASSWORD: undefined,
      AUTH_INITIAL_ADMIN_ROLE_REQUIRED: undefined,
      // Eval service account defaults
      EVAL_SERVICE_ACCOUNT_API_KEY: undefined,
      EVAL_SERVICE_ACCOUNT_EMAIL: 'eval-service@internal',
    };

    const config = { ...defaults, ...overrides };
    return config;
  }

  async function buildModule(configOverrides: Record<string, string | undefined> = {}) {
    const config = createConfigMap(configOverrides);
    const mockUserRepo = createMockUserRepository();
    const mockUserGroupRepo = createMockUserGroupRepository();

    const configService = {
      get: jest.fn((key: string, defaultValue?: string) => config[key] ?? defaultValue),
      getOrThrow: jest.fn((key: string) => {
        if (config[key] === undefined) throw new Error(`Missing config: ${key}`);
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: configService },
        { provide: getRepositoryToken(UserEntity), useValue: mockUserRepo },
        { provide: getRepositoryToken(UserGroupEntity), useValue: mockUserGroupRepo },
      ],
    }).compile();

    return {
      service: module.get<AuthService>(AuthService),
      mockUserRepo,
      mockUserGroupRepo,
      configService,
    };
  }

  describe('setupEvalServiceAccount - API key validation', () => {
    it('should accept a valid 64-character hex API key', async () => {
      const validKey = 'ff45eeab60df2470fcefd602c4846354a314a723a6a9a63d7b6d8c810098f15e';
      const { service } = await buildModule({ EVAL_SERVICE_ACCOUNT_API_KEY: validKey });

      // onModuleInit should succeed without throwing
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });

    it('should accept uppercase hex characters', async () => {
      const validKey = 'FF45EEAB60DF2470FCEFD602C4846354A314A723A6A9A63D7B6D8C810098F15E';
      const { service } = await buildModule({ EVAL_SERVICE_ACCOUNT_API_KEY: validKey });

      await expect(service.onModuleInit()).resolves.not.toThrow();
    });

    it('should accept a key longer than 64 hex characters', async () => {
      const longKey = 'a'.repeat(128); // 512-bit key — perfectly fine
      const { service } = await buildModule({ EVAL_SERVICE_ACCOUNT_API_KEY: longKey });

      await expect(service.onModuleInit()).resolves.not.toThrow();
    });

    it('should reject a key shorter than 64 characters', async () => {
      const shortKey = 'abcdef1234567890'; // 16 chars
      const { service } = await buildModule({ EVAL_SERVICE_ACCOUNT_API_KEY: shortKey });

      await expect(service.onModuleInit()).rejects.toThrow(/EVAL_SERVICE_ACCOUNT_API_KEY must be at least 64 hex characters/);
    });

    it('should reject a 64-character key with non-hex characters', async () => {
      const nonHexKey = 'g'.repeat(64); // 'g' is not a valid hex character
      const { service } = await buildModule({ EVAL_SERVICE_ACCOUNT_API_KEY: nonHexKey });

      await expect(service.onModuleInit()).rejects.toThrow(/EVAL_SERVICE_ACCOUNT_API_KEY must be a hex string/);
    });

    it('should reject a non-hex key even if short', async () => {
      const { service } = await buildModule({ EVAL_SERVICE_ACCOUNT_API_KEY: 'test' });

      await expect(service.onModuleInit()).rejects.toThrow(/EVAL_SERVICE_ACCOUNT_API_KEY must be a hex string/);
    });

    it('should include the received length in the error message for short hex keys', async () => {
      const shortKey = 'abc123'; // 6 chars, valid hex but too short
      const { service } = await buildModule({ EVAL_SERVICE_ACCOUNT_API_KEY: shortKey });

      await expect(service.onModuleInit()).rejects.toThrow(/Received a 6-character value/);
    });

    it('should suggest openssl command in the error message', async () => {
      const { service } = await buildModule({ EVAL_SERVICE_ACCOUNT_API_KEY: 'abcd' });

      await expect(service.onModuleInit()).rejects.toThrow(/openssl rand -hex 32/);
    });

    it('should skip validation when no API key is configured', async () => {
      const { service } = await buildModule({ EVAL_SERVICE_ACCOUNT_API_KEY: undefined });

      // Should not throw — just skips eval account setup
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });

    it('should provision the eval service account when key is valid', async () => {
      const validKey = 'ff45eeab60df2470fcefd602c4846354a314a723a6a9a63d7b6d8c810098f15e';
      const { service, mockUserRepo } = await buildModule({ EVAL_SERVICE_ACCOUNT_API_KEY: validKey });

      await service.onModuleInit();

      // Should have called create (since findOne returns null)
      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'eval-service@internal',
          name: 'Eval Service',
        }),
      );
      expect(mockUserRepo.save).toHaveBeenCalled();
    });
  });
});
