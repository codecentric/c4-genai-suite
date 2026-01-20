import { createHash } from 'crypto';
import { Server } from 'net';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { BUILTIN_USER_GROUP_ADMIN, UserEntity, UserGroupEntity } from '../../domain/database';

const ADMIN_API_KEY = 'admin-secret-key-12345';
const USER_API_KEY = 'user-secret-key-67890';
const INVALID_API_KEY = 'invalid-key';

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

async function seedTestData(dataSource: DataSource) {
  const userGroupRepo = dataSource.getRepository(UserGroupEntity);
  const userRepo = dataSource.getRepository(UserEntity);

  // Create admin user group
  const adminGroup = new UserGroupEntity();
  adminGroup.id = BUILTIN_USER_GROUP_ADMIN;
  adminGroup.name = 'Admin';
  adminGroup.isAdmin = true;
  adminGroup.isBuiltIn = true;
  await userGroupRepo.save(adminGroup);

  // Create default user group
  const defaultGroup = new UserGroupEntity();
  defaultGroup.id = 'default';
  defaultGroup.name = 'Default';
  defaultGroup.isAdmin = false;
  defaultGroup.isBuiltIn = true;
  await userGroupRepo.save(defaultGroup);

  // Create admin user with API key
  const adminUser = new UserEntity();
  adminUser.id = 'admin-user-id';
  adminUser.name = 'Admin User';
  adminUser.email = 'admin@test.com';
  adminUser.apiKey = hashApiKey(ADMIN_API_KEY);
  adminUser.userGroups = [adminGroup];
  await userRepo.save(adminUser);

  // Create regular user with API key
  const regularUser = new UserEntity();
  regularUser.id = 'regular-user-id';
  regularUser.name = 'Regular User';
  regularUser.email = 'user@test.com';
  regularUser.apiKey = hashApiKey(USER_API_KEY);
  regularUser.userGroups = [defaultGroup];
  await userRepo.save(regularUser);
}

describe('API Key Authentication', () => {
  let app: INestApplication<Server>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    dataSource = module.get<DataSource>(getDataSourceToken());
    app = module.createNestApplication();
    await app.init();
    await seedTestData(dataSource);
  }, 30000);

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  }, 30000);

  describe('GET /users (admin-protected endpoint)', () => {
    it('should allow access with valid admin API key', async () => {
      await request(app.getHttpServer()).get('/users').set('x-api-key', ADMIN_API_KEY).expect(HttpStatus.OK);
    });

    it('should deny access (403) with valid non-admin API key', async () => {
      await request(app.getHttpServer()).get('/users').set('x-api-key', USER_API_KEY).expect(HttpStatus.FORBIDDEN);
    });

    it('should deny access (401) with invalid API key', async () => {
      await request(app.getHttpServer()).get('/users').set('x-api-key', INVALID_API_KEY).expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /auth/profile', () => {
    it('should return admin user profile with isAdmin=true', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('x-api-key', ADMIN_API_KEY)
        .expect(HttpStatus.OK);

      const body = response.body as { isAdmin: boolean; email: string };
      expect(body.isAdmin).toBe(true);
      expect(body.email).toBe('admin@test.com');
    });

    it('should return regular user profile with isAdmin=false', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('x-api-key', USER_API_KEY)
        .expect(HttpStatus.OK);

      const body = response.body as { isAdmin: boolean; email: string };
      expect(body.isAdmin).toBe(false);
      expect(body.email).toBe('user@test.com');
    });
  });
});
