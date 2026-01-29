import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditAction, AuditEntityType, AuditLogEntity, AuditLogRepository } from 'src/domain/database';

export interface CreateAuditLogParams {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  userId: string;
  userName?: string;
  snapshot: Record<string, any>;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogs: AuditLogRepository,
  ) {}

  async createAuditLog(params: CreateAuditLogParams): Promise<AuditLogEntity> {
    const { entityType, entityId, action, userId, userName, snapshot } = params;

    const entity = this.auditLogs.create({
      entityType,
      entityId,
      action,
      userId,
      userName,
      snapshot,
    });

    return this.auditLogs.save(entity);
  }
}
