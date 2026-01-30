import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditEntityType, AuditLogEntity, AuditLogRepository } from 'src/domain/database';
import { AuditLog } from '../interfaces';

export class GetAuditLogs {
  constructor(
    public readonly options?: {
      entityType?: AuditEntityType;
      entityId?: string;
      configurationId?: number;
      page?: number;
      pageSize?: number;
    },
  ) {}
}

export class GetAuditLogsResponse {
  constructor(
    public readonly auditLogs: AuditLog[],
    public readonly total: number,
  ) {}
}

function buildAuditLog(entity: AuditLogEntity): AuditLog {
  return {
    id: entity.id,
    entityType: entity.entityType,
    entityId: entity.entityId,
    action: entity.action,
    userId: entity.userId,
    userName: entity.userName,
    snapshot: entity.snapshot,
    createdAt: entity.createdAt,
  };
}

@QueryHandler(GetAuditLogs)
export class GetAuditLogsHandler implements IQueryHandler<GetAuditLogs, GetAuditLogsResponse> {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogs: AuditLogRepository,
  ) {}

  async execute(query: GetAuditLogs): Promise<GetAuditLogsResponse> {
    const { entityType, entityId, configurationId, page = 0, pageSize = 50 } = query.options ?? {};

    const queryBuilder = this.auditLogs.createQueryBuilder('audit_log');

    if (configurationId) {
      // Filter for configuration changes and related extension changes
      queryBuilder.andWhere(
        `(
          (audit_log.entityType = 'configuration' AND audit_log.entityId = :configId)
          OR (audit_log.entityType = 'extension' AND audit_log.snapshot->>'configurationId' = :configId)
        )`,
        { configId: String(configurationId) },
      );
    } else {
      if (entityType) {
        queryBuilder.andWhere('audit_log.entityType = :entityType', { entityType });
      }

      if (entityId) {
        queryBuilder.andWhere('audit_log.entityId = :entityId', { entityId });
      }
    }

    queryBuilder.orderBy('audit_log.createdAt', 'DESC');
    queryBuilder.skip(page * pageSize);
    queryBuilder.take(pageSize);

    const [entities, total] = await queryBuilder.getManyAndCount();

    return new GetAuditLogsResponse(entities.map(buildAuditLog), total);
  }
}
