import { Server } from 'net';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../../app.module';
import { UserEntity, UserGroupEntity } from '../../domain/database';
import { initAppWithDataBaseAndValidUser } from '../../utils/testUtils';
import { UserGroupDto, UserGroupsDto } from './dtos';
import { UserGroupsController } from './user-groups.controller';

describe('User Group', () => {
  let controller: UserGroupsController;
  let app: INestApplication<Server>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    controller = module.get(UserGroupsController);

    const initialized = await initAppWithDataBaseAndValidUser(dataSource, module, app);
    dataSource = initialized.dataSource;
    app = initialized.app;
    await seedTestData(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  it('should get all user groups', async () => {
    const response = await request(app.getHttpServer()).get('/user-groups').expect(200);

    const typedBody = response.body as UserGroupsDto;

    expect(typedBody.items).toHaveLength(4);
  });
  it('should create user group', async () => {
    const newUserGroup = {
      name: 'test-group',
      monthlyUserTokens: 1000,
    };

    const response = await request(app.getHttpServer()).post('/user-groups').send(newUserGroup).expect(201);

    const typedBody = response.body as UserGroupDto;
    expect(typedBody.id).toBeDefined();
    expect(typedBody.name).toBe(newUserGroup.name);
    expect(typedBody.monthlyUserTokens).toBe(newUserGroup.monthlyUserTokens);
    expect(typedBody.isAdmin).toBe(false);
    expect(typedBody.isBuiltIn).toBe(false);
  });
  it('should update user group', async () => {
    const userGroupRepository = dataSource.getRepository(UserGroupEntity);
    const userGroupToUpdate = await userGroupRepository.findOneBy({ name: 'test-group' });

    const updatedUserGroup = {
      name: 'test-group',
      monthlyUserTokens: 2000,
    };

    const response = await request(app.getHttpServer())
      .put(`/user-groups/${userGroupToUpdate?.id}`)
      .send(updatedUserGroup)
      .expect(200);

    const typedBody = response.body as UserGroupDto;
    expect(typedBody.id).toBe(userGroupToUpdate?.id);
    expect(typedBody.name).toBe(updatedUserGroup.name);
    expect(typedBody.monthlyUserTokens).toBe(updatedUserGroup.monthlyUserTokens);
    expect(typedBody.isAdmin).toBe(false);
    expect(typedBody.isBuiltIn).toBe(false);
  });
  it('should remove user group without users', async () => {
    const userGroupRepository = dataSource.getRepository(UserGroupEntity);
    const removableGroup = await userGroupRepository.findOne({ where: { name: 'removable' } });

    await request(app.getHttpServer()).delete(`/user-groups/${removableGroup?.id}`).expect(200);
  });
  it('should not remove user group with users', async () => {
    const userGroupRepository = dataSource.getRepository(UserGroupEntity);
    const notRemovableGroup = await userGroupRepository.findOne({ where: { name: 'not removable' } });

    const response = await request(app.getHttpServer()).delete(`/user-groups/${notRemovableGroup?.id}`).expect(400);

    const typedBody = response.body as { message: string[] };
    expect(typedBody.message).toBe('Cannot delete a user group with existing users.');
  });
});

async function seedTestData(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(UserEntity);
  const userGroupRepository = dataSource.getRepository(UserGroupEntity);

  await createUserGroup('removable', userGroupRepository);

  const userGroupNotRemovable = await createUserGroup('not removable', userGroupRepository);
  await createUserEntities('user1', userGroupNotRemovable, userRepository);
  await createUserEntities('user2', userGroupNotRemovable, userRepository);
}

async function createUserEntities(
  name: string,
  userGroup: UserGroupEntity,
  userRepository: Repository<UserEntity>,
): Promise<UserEntity> {
  const userEntity = new UserEntity();
  userEntity.id = crypto.randomUUID();
  userEntity.name = name;
  userEntity.email = `${name}@test.com`;
  userEntity.userGroups = [userGroup];
  return userRepository.save(userEntity);
}

async function createUserGroup(name: string, userGroupRepository: Repository<UserGroupEntity>): Promise<UserGroupEntity> {
  const userGroupEntity: UserGroupEntity = new UserGroupEntity();
  userGroupEntity.id = crypto.randomUUID();
  userGroupEntity.name = name;
  return userGroupRepository.save(userGroupEntity);
}
