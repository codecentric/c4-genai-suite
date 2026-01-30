import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLogEntity, AuditLogRepository } from 'src/domain/database';
import { AuditLog } from '../interfaces';

export class GetAuditLogById {
  constructor(public readonly id: number) {}
}

export class GetAuditLogByIdResponse {
  constructor(
    public readonly auditLog: AuditLog | null,
    public readonly previousSnapshot: Record<string, unknown> | null,
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

@QueryHandler(GetAuditLogById)
export class GetAuditLogByIdHandler implements IQueryHandler<GetAuditLogById, GetAuditLogByIdResponse> {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogs: AuditLogRepository,
  ) {}

  async execute(query: GetAuditLogById): Promise<GetAuditLogByIdResponse> {
    const { id } = query;

    // Fetch the requested audit log
    const entity = await this.auditLogs.findOneBy({ id });

    if (!entity) {
      return new GetAuditLogByIdResponse(null, null);
    }

    // Find the previous audit log for the same entity (earlier createdAt, same entityType and entityId)
    const previousEntity = await this.auditLogs
      .createQueryBuilder('audit_log')
      .where('audit_log.entityType = :entityType', { entityType: entity.entityType })
      .andWhere('audit_log.entityId = :entityId', { entityId: entity.entityId })
      .andWhere('audit_log.createdAt < :createdAt', { createdAt: entity.createdAt })
      .orderBy('audit_log.createdAt', 'DESC')
      .limit(1)
      .getOne();

    return new GetAuditLogByIdResponse(buildAuditLog(entity), previousEntity?.snapshot ?? null);
  }
}
