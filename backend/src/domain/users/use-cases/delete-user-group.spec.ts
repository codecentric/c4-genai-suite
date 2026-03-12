import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeleteResult } from 'typeorm';
import { AuditLogService } from 'src/domain/audit-log';
import { UserGroupEntity, UserGroupRepository } from '../../database';
import { DeleteUserGroup, DeleteUserGroupHandler } from './delete-user-group';

const mockPerformedBy = { id: 'test-user', name: 'Test User' };

describe('DeleteUserGroup', () => {
  let handler: DeleteUserGroupHandler;
  let userGroupRepository: Pick<UserGroupRepository, 'findOne' | 'delete'>;

  beforeAll(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteUserGroupHandler,
        {
          provide: getRepositoryToken(UserGroupEntity),
          useValue: {
            findOne: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            createAuditLog: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get(DeleteUserGroupHandler);
    userGroupRepository = module.get<UserGroupRepository>(getRepositoryToken(UserGroupEntity));
  });
  it('should be defined', () => {
    expect(DeleteUserGroup).toBeDefined();
  });
  it('should throw NotFoundException if user group is not found', async () => {
    const command = new DeleteUserGroup('1', mockPerformedBy);
    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });
  it('should throw BadRequestException if user group has existing users', async () => {
    const userGroupId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const user = { id: userId, name: 'user1' };
    jest.spyOn(userGroupRepository, 'findOne').mockResolvedValueOnce({ id: userGroupId, users: [user] } as UserGroupEntity);
    const command = new DeleteUserGroup(userGroupId, mockPerformedBy);
    await expect(handler.execute(command)).rejects.toThrow('Cannot delete a user group with existing users.');
  });
  it('should throw BadRequestException if user group is builtin', async () => {
    const userGroupId = crypto.randomUUID();

    jest
      .spyOn(userGroupRepository, 'findOne')
      .mockResolvedValueOnce({ id: userGroupId, isAdmin: true, isBuiltIn: true } as UserGroupEntity);
    const command = new DeleteUserGroup(userGroupId, mockPerformedBy);

    await expect(handler.execute(command)).rejects.toThrow('Cannot delete builtin user group.');
  });
  it('should delete user group', async () => {
    const userGroupId = crypto.randomUUID();

    jest.spyOn(userGroupRepository, 'findOne').mockResolvedValueOnce({ id: userGroupId } as UserGroupEntity);
    jest.spyOn(userGroupRepository, 'delete').mockResolvedValueOnce({ affected: 1, raw: {} as DeleteResult });

    const command = new DeleteUserGroup(userGroupId, mockPerformedBy);
    await handler.execute(command);

    expect(userGroupRepository.delete).toHaveBeenCalledWith({ id: userGroupId });
  });
});
