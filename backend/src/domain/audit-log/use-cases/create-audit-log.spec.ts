import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from 'src/domain/database';
import { AuditLogService } from './create-audit-log';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repository: Repository<AuditLogEntity>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: getRepositoryToken(AuditLogEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuditLogService);
    repository = module.get(getRepositoryToken(AuditLogEntity));
  });

  describe('createAuditLog', () => {
    it('should create and save an audit log entry', async () => {
      const mockEntity: AuditLogEntity = {
        id: 1,
        entityType: 'configuration',
        entityId: '123',
        action: 'create',
        userId: 'user1',
        userName: 'Test User',
        snapshot: { name: 'Test Config' },
        createdAt: new Date(),
      } as AuditLogEntity;

      jest.spyOn(repository, 'create').mockReturnValue(mockEntity);
      jest.spyOn(repository, 'save').mockResolvedValue(mockEntity);

      const params = {
        entityType: 'configuration' as const,
        entityId: '123',
        action: 'create' as const,
        userId: 'user1',
        userName: 'Test User',
        snapshot: { name: 'Test Config' },
      };

      const result = await service.createAuditLog(params);

      expect(repository.create).toHaveBeenCalledWith({
        entityType: 'configuration',
        entityId: '123',
        action: 'create',
        userId: 'user1',
        userName: 'Test User',
        snapshot: { name: 'Test Config' },
      });
      expect(repository.save).toHaveBeenCalledWith(mockEntity);
      expect(result).toEqual(mockEntity);
    });

    it('should create audit log for extension creation', async () => {
      const mockEntity: AuditLogEntity = {
        id: 2,
        entityType: 'extension',
        entityId: 'ext-456',
        action: 'create',
        userId: 'admin',
        userName: 'Admin User',
        snapshot: { name: 'OpenAI Extension', type: 'llm' },
        createdAt: new Date(),
      } as AuditLogEntity;

      jest.spyOn(repository, 'create').mockReturnValue(mockEntity);
      jest.spyOn(repository, 'save').mockResolvedValue(mockEntity);

      const params = {
        entityType: 'extension' as const,
        entityId: 'ext-456',
        action: 'create' as const,
        userId: 'admin',
        userName: 'Admin User',
        snapshot: { name: 'OpenAI Extension', type: 'llm' },
      };

      const result = await service.createAuditLog(params);

      expect(result.entityType).toBe('extension');
      expect(result.action).toBe('create');
    });

    it('should create audit log for bucket update', async () => {
      const mockEntity: AuditLogEntity = {
        id: 3,
        entityType: 'bucket',
        entityId: 'bucket-789',
        action: 'update',
        userId: 'user2',
        userName: 'Another User',
        snapshot: { name: 'Updated Bucket', permissions: ['read', 'write'] },
        createdAt: new Date(),
      } as AuditLogEntity;

      jest.spyOn(repository, 'create').mockReturnValue(mockEntity);
      jest.spyOn(repository, 'save').mockResolvedValue(mockEntity);

      const params = {
        entityType: 'bucket' as const,
        entityId: 'bucket-789',
        action: 'update' as const,
        userId: 'user2',
        userName: 'Another User',
        snapshot: { name: 'Updated Bucket', permissions: ['read', 'write'] },
      };

      await service.createAuditLog(params);

      expect(repository.create).toHaveBeenCalledWith({
        entityType: 'bucket',
        entityId: 'bucket-789',
        action: 'update',
        userId: 'user2',
        userName: 'Another User',
        snapshot: { name: 'Updated Bucket', permissions: ['read', 'write'] },
      });
    });

    it('should create audit log for user group deletion', async () => {
      const mockEntity: AuditLogEntity = {
        id: 4,
        entityType: 'userGroup',
        entityId: 'group-abc',
        action: 'delete',
        userId: 'admin',
        userName: 'Administrator',
        snapshot: { name: 'Deleted Group', memberCount: 5 },
        createdAt: new Date(),
      } as AuditLogEntity;

      jest.spyOn(repository, 'create').mockReturnValue(mockEntity);
      jest.spyOn(repository, 'save').mockResolvedValue(mockEntity);

      const params = {
        entityType: 'userGroup' as const,
        entityId: 'group-abc',
        action: 'delete' as const,
        userId: 'admin',
        userName: 'Administrator',
        snapshot: { name: 'Deleted Group', memberCount: 5 },
      };

      const result = await service.createAuditLog(params);

      expect(result.action).toBe('delete');
      expect(result.entityType).toBe('userGroup');
    });

    it('should create audit log for settings update', async () => {
      const mockEntity: AuditLogEntity = {
        id: 5,
        entityType: 'settings',
        entityId: 'global',
        action: 'update',
        userId: 'admin',
        userName: 'System Admin',
        snapshot: { theme: 'dark', language: 'en' },
        createdAt: new Date(),
      } as AuditLogEntity;

      jest.spyOn(repository, 'create').mockReturnValue(mockEntity);
      jest.spyOn(repository, 'save').mockResolvedValue(mockEntity);

      const params = {
        entityType: 'settings' as const,
        entityId: 'global',
        action: 'update' as const,
        userId: 'admin',
        userName: 'System Admin',
        snapshot: { theme: 'dark', language: 'en' },
      };

      await service.createAuditLog(params);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'settings',
          entityId: 'global',
        }),
      );
    });

    it('should create audit log without userName', async () => {
      const mockEntity: AuditLogEntity = {
        id: 6,
        entityType: 'user',
        entityId: 'user-def',
        action: 'update',
        userId: 'system',
        userName: undefined,
        snapshot: { email: 'updated@example.com' },
        createdAt: new Date(),
      } as AuditLogEntity;

      jest.spyOn(repository, 'create').mockReturnValue(mockEntity);
      jest.spyOn(repository, 'save').mockResolvedValue(mockEntity);

      const params = {
        entityType: 'user' as const,
        entityId: 'user-def',
        action: 'update' as const,
        userId: 'system',
        snapshot: { email: 'updated@example.com' },
      };

      const result = await service.createAuditLog(params);

      expect(repository.create).toHaveBeenCalledWith({
        entityType: 'user',
        entityId: 'user-def',
        action: 'update',
        userId: 'system',
        userName: undefined,
        snapshot: { email: 'updated@example.com' },
      });
      expect(result.userName).toBeUndefined();
    });

    it('should handle complex snapshot objects', async () => {
      const complexSnapshot = {
        id: 123,
        name: 'Complex Entity',
        nested: {
          field1: 'value1',
          field2: ['array', 'of', 'values'],
        },
        metadata: {
          createdBy: 'user1',
          tags: ['tag1', 'tag2'],
        },
      };

      const mockEntity: AuditLogEntity = {
        id: 7,
        entityType: 'configuration',
        entityId: 'config-999',
        action: 'create',
        userId: 'user1',
        userName: 'Test User',
        snapshot: complexSnapshot,
        createdAt: new Date(),
      } as AuditLogEntity;

      jest.spyOn(repository, 'create').mockReturnValue(mockEntity);
      jest.spyOn(repository, 'save').mockResolvedValue(mockEntity);

      const params = {
        entityType: 'configuration' as const,
        entityId: 'config-999',
        action: 'create' as const,
        userId: 'user1',
        userName: 'Test User',
        snapshot: complexSnapshot,
      };

      const result = await service.createAuditLog(params);

      expect(result.snapshot).toEqual(complexSnapshot);
    });

    it('should preserve snapshot with null and undefined values', async () => {
      const snapshotWithNulls = {
        name: 'Entity',
        optionalField: null,
        anotherField: undefined,
        existingValue: 'value',
      };

      const mockEntity: AuditLogEntity = {
        id: 8,
        entityType: 'extension',
        entityId: 'ext-111',
        action: 'update',
        userId: 'user1',
        userName: 'Test User',
        snapshot: snapshotWithNulls,
        createdAt: new Date(),
      } as AuditLogEntity;

      jest.spyOn(repository, 'create').mockReturnValue(mockEntity);
      jest.spyOn(repository, 'save').mockResolvedValue(mockEntity);

      const params = {
        entityType: 'extension' as const,
        entityId: 'ext-111',
        action: 'update' as const,
        userId: 'user1',
        userName: 'Test User',
        snapshot: snapshotWithNulls,
      };

      await service.createAuditLog(params);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          snapshot: snapshotWithNulls,
        }),
      );
    });
  });
});
