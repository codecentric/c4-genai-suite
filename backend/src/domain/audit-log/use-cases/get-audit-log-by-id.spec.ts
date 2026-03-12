import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AuditLogEntity } from 'src/domain/database';
import { GetAuditLogById, GetAuditLogByIdHandler } from './get-audit-log-by-id';

describe('GetAuditLogByIdHandler', () => {
  let handler: GetAuditLogByIdHandler;
  let repository: Repository<AuditLogEntity>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<AuditLogEntity>>;

  beforeEach(async () => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<AuditLogEntity>>;

    const module = await Test.createTestingModule({
      providers: [
        GetAuditLogByIdHandler,
        {
          provide: getRepositoryToken(AuditLogEntity),
          useValue: {
            findOneBy: jest.fn(),
            createQueryBuilder: jest.fn(() => queryBuilder),
          },
        },
      ],
    }).compile();

    handler = module.get(GetAuditLogByIdHandler);
    repository = module.get(getRepositoryToken(AuditLogEntity));
  });

  describe('execute', () => {
    it('should return audit log with previous snapshot', async () => {
      const currentEntity: AuditLogEntity = {
        id: 2,
        entityType: 'configuration',
        entityId: '123',
        action: 'update',
        userId: 'user1',
        userName: 'Test User',
        snapshot: { name: 'Updated Config', version: 2 },
        createdAt: new Date('2026-01-02'),
      } as AuditLogEntity;

      const previousEntity: AuditLogEntity = {
        id: 1,
        entityType: 'configuration',
        entityId: '123',
        action: 'create',
        userId: 'user1',
        userName: 'Test User',
        snapshot: { name: 'Original Config', version: 1 },
        createdAt: new Date('2026-01-01'),
      } as AuditLogEntity;

      jest.spyOn(repository, 'findOneBy').mockResolvedValue(currentEntity);
      queryBuilder.getOne.mockResolvedValue(previousEntity);

      const query = new GetAuditLogById(2);
      const result = await handler.execute(query);

      expect(result.auditLog).toEqual({
        id: 2,
        entityType: 'configuration',
        entityId: '123',
        action: 'update',
        userId: 'user1',
        userName: 'Test User',
        snapshot: { name: 'Updated Config', version: 2 },
        createdAt: currentEntity.createdAt,
      });
      expect(result.previousSnapshot).toEqual({ name: 'Original Config', version: 1 });
    });

    it('should return null when audit log not found', async () => {
      jest.spyOn(repository, 'findOneBy').mockResolvedValue(null);

      const query = new GetAuditLogById(999);
      const result = await handler.execute(query);

      expect(result.auditLog).toBeNull();
      expect(result.previousSnapshot).toBeNull();
    });

    it('should return null previous snapshot for first audit log entry', async () => {
      const firstEntity: AuditLogEntity = {
        id: 1,
        entityType: 'bucket',
        entityId: 'bucket-1',
        action: 'create',
        userId: 'user1',
        userName: 'Test User',
        snapshot: { name: 'My Bucket' },
        createdAt: new Date('2026-01-01'),
      } as AuditLogEntity;

      jest.spyOn(repository, 'findOneBy').mockResolvedValue(firstEntity);
      queryBuilder.getOne.mockResolvedValue(null);

      const query = new GetAuditLogById(1);
      const result = await handler.execute(query);

      expect(result.auditLog).toBeDefined();
      expect(result.previousSnapshot).toBeNull();
    });

    it('should query for previous snapshot correctly', async () => {
      const currentEntity: AuditLogEntity = {
        id: 3,
        entityType: 'userGroup',
        entityId: 'group-456',
        action: 'update',
        userId: 'admin',
        userName: 'Admin',
        snapshot: { name: 'Updated Group' },
        createdAt: new Date('2026-01-15T10:00:00Z'),
      } as AuditLogEntity;

      jest.spyOn(repository, 'findOneBy').mockResolvedValue(currentEntity);
      queryBuilder.getOne.mockResolvedValue(null);

      const query = new GetAuditLogById(3);
      await handler.execute(query);

      expect(queryBuilder.where).toHaveBeenCalledWith('audit_log.entityType = :entityType', {
        entityType: 'userGroup',
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('audit_log.entityId = :entityId', {
        entityId: 'group-456',
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('audit_log.createdAt < :createdAt', {
        createdAt: currentEntity.createdAt,
      });
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('audit_log.createdAt', 'DESC');
      expect(queryBuilder.limit).toHaveBeenCalledWith(1);
    });

    it('should handle multiple previous entries and return the most recent', async () => {
      const currentEntity: AuditLogEntity = {
        id: 5,
        entityType: 'extension',
        entityId: 'ext-789',
        action: 'update',
        userId: 'user1',
        userName: 'Test User',
        snapshot: { version: 3 },
        createdAt: new Date('2026-01-15'),
      } as AuditLogEntity;

      const mostRecentPreviousEntity: AuditLogEntity = {
        id: 4,
        entityType: 'extension',
        entityId: 'ext-789',
        action: 'update',
        userId: 'user1',
        userName: 'Test User',
        snapshot: { version: 2 },
        createdAt: new Date('2026-01-10'),
      } as AuditLogEntity;

      jest.spyOn(repository, 'findOneBy').mockResolvedValue(currentEntity);
      queryBuilder.getOne.mockResolvedValue(mostRecentPreviousEntity);

      const query = new GetAuditLogById(5);
      const result = await handler.execute(query);

      expect(result.previousSnapshot).toEqual({ version: 2 });
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('audit_log.createdAt', 'DESC');
      expect(queryBuilder.limit).toHaveBeenCalledWith(1);
    });

    it('should map all audit log properties correctly', async () => {
      const entity: AuditLogEntity = {
        id: 10,
        entityType: 'user',
        entityId: 'user-abc',
        action: 'delete',
        userId: 'admin',
        userName: 'Administrator',
        snapshot: { email: 'deleted@example.com' },
        createdAt: new Date('2026-02-01T12:30:00Z'),
      } as AuditLogEntity;

      jest.spyOn(repository, 'findOneBy').mockResolvedValue(entity);
      queryBuilder.getOne.mockResolvedValue(null);

      const query = new GetAuditLogById(10);
      const result = await handler.execute(query);

      expect(result.auditLog).toEqual({
        id: 10,
        entityType: 'user',
        entityId: 'user-abc',
        action: 'delete',
        userId: 'admin',
        userName: 'Administrator',
        snapshot: { email: 'deleted@example.com' },
        createdAt: entity.createdAt,
      });
    });

    it('should handle audit log with missing userName', async () => {
      const entity: AuditLogEntity = {
        id: 11,
        entityType: 'settings',
        entityId: 'global',
        action: 'update',
        userId: 'system',
        userName: undefined,
        snapshot: { theme: 'dark' },
        createdAt: new Date('2026-02-05'),
      } as AuditLogEntity;

      jest.spyOn(repository, 'findOneBy').mockResolvedValue(entity);
      queryBuilder.getOne.mockResolvedValue(null);

      const query = new GetAuditLogById(11);
      const result = await handler.execute(query);

      expect(result.auditLog?.userName).toBeUndefined();
      expect(result.auditLog?.userId).toBe('system');
    });
  });
});
