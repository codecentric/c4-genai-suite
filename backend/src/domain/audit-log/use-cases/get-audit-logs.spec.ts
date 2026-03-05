import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AuditLogEntity } from 'src/domain/database';
import { GetAuditLogs, GetAuditLogsHandler } from './get-audit-logs';

describe('GetAuditLogsHandler', () => {
  let handler: GetAuditLogsHandler;
  let _repository: Repository<AuditLogEntity>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<AuditLogEntity>>;

  beforeEach(async () => {
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<AuditLogEntity>>;

    const module = await Test.createTestingModule({
      providers: [
        GetAuditLogsHandler,
        {
          provide: getRepositoryToken(AuditLogEntity),
          useValue: {
            createQueryBuilder: jest.fn(() => queryBuilder),
          },
        },
      ],
    }).compile();

    handler = module.get(GetAuditLogsHandler);
    _repository = module.get(getRepositoryToken(AuditLogEntity));
  });

  describe('execute', () => {
    it('should return audit logs with default pagination', async () => {
      const mockAuditLogs: AuditLogEntity[] = [
        {
          id: 1,
          entityType: 'configuration',
          entityId: '123',
          action: 'create',
          userId: 'user1',
          userName: 'Test User',
          snapshot: { name: 'Test Config' },
          createdAt: new Date('2026-01-01'),
        } as AuditLogEntity,
        {
          id: 2,
          entityType: 'extension',
          entityId: '456',
          action: 'update',
          userId: 'user1',
          userName: 'Test User',
          snapshot: { name: 'Test Extension' },
          createdAt: new Date('2026-01-02'),
        } as AuditLogEntity,
      ];

      queryBuilder.getManyAndCount.mockResolvedValue([mockAuditLogs, 2]);

      const query = new GetAuditLogs();
      const result = await handler.execute(query);

      expect(result.auditLogs).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('audit_log.createdAt', 'DESC');
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(50);
    });

    it('should filter by entity type', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const query = new GetAuditLogs({ entityType: 'configuration' });
      await handler.execute(query);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('audit_log.entityType = :entityType', {
        entityType: 'configuration',
      });
    });

    it('should filter by entity ID', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const query = new GetAuditLogs({ entityId: '123' });
      await handler.execute(query);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('audit_log.entityId = :entityId', {
        entityId: '123',
      });
    });

    it('should filter by configuration ID', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const query = new GetAuditLogs({ configurationId: 42 });
      await handler.execute(query);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(expect.stringContaining("audit_log.entityType = 'configuration'"), {
        configId: '42',
      });
    });

    it('should apply custom pagination', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const query = new GetAuditLogs({ page: 2, pageSize: 10 });
      await handler.execute(query);

      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should filter by entity type and entity ID together', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const query = new GetAuditLogs({
        entityType: 'bucket',
        entityId: 'bucket-123',
      });
      await handler.execute(query);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('audit_log.entityType = :entityType', {
        entityType: 'bucket',
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('audit_log.entityId = :entityId', {
        entityId: 'bucket-123',
      });
    });

    it('should apply configuration filter when configurationId is 0', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const query = new GetAuditLogs({ configurationId: 0 });
      await handler.execute(query);

      // configurationId 0 is a valid numeric ID and must not be treated as falsy
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(expect.stringContaining("audit_log.entityType = 'configuration'"), {
        configId: '0',
      });
    });

    it('should not apply entity filters when configurationId is provided', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const query = new GetAuditLogs({
        configurationId: 42,
        entityType: 'extension', // This should be ignored
        entityId: '123', // This should be ignored
      });
      await handler.execute(query);

      // Should only call andWhere once for configuration filter
      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(1);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(expect.stringContaining("audit_log.entityType = 'configuration'"), {
        configId: '42',
      });
    });

    it('should return empty result when no audit logs found', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const query = new GetAuditLogs({ entityType: 'user' });
      const result = await handler.execute(query);

      expect(result.auditLogs).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should correctly map entity properties to audit log', async () => {
      const mockEntity: AuditLogEntity = {
        id: 1,
        entityType: 'settings',
        entityId: 'global',
        action: 'update',
        userId: 'admin',
        userName: 'Admin User',
        snapshot: { key: 'value' },
        createdAt: new Date('2026-01-15'),
      } as AuditLogEntity;

      queryBuilder.getManyAndCount.mockResolvedValue([[mockEntity], 1]);

      const query = new GetAuditLogs();
      const result = await handler.execute(query);

      expect(result.auditLogs[0]).toEqual({
        id: 1,
        entityType: 'settings',
        entityId: 'global',
        action: 'update',
        userId: 'admin',
        userName: 'Admin User',
        snapshot: { key: 'value' },
        createdAt: mockEntity.createdAt,
      });
    });
  });
});
