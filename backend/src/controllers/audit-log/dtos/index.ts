import { ApiProperty } from '@nestjs/swagger';
import { AuditAction, AuditEntityType } from 'src/domain/database';
import { AuditLog } from 'src/domain/audit-log';

export class AuditLogDto {
  @ApiProperty({
    description: 'The ID of the audit log entry.',
    required: true,
  })
  id!: number;

  @ApiProperty({
    description: 'The type of entity that was modified.',
    required: true,
    enum: ['extension', 'bucket', 'configuration', 'settings', 'userGroup', 'user'],
  })
  entityType!: AuditEntityType;

  @ApiProperty({
    description: 'The ID of the entity that was modified.',
    required: true,
  })
  entityId!: string;

  @ApiProperty({
    description: 'The action that was performed.',
    required: true,
    enum: ['create', 'update', 'delete'],
  })
  action!: AuditAction;

  @ApiProperty({
    description: 'The ID of the user who performed the action.',
    required: true,
  })
  userId!: string;

  @ApiProperty({
    description: 'The name of the user who performed the action.',
    required: false,
  })
  userName?: string;

  @ApiProperty({
    description: 'The complete state snapshot of the entity at the time of the action.',
    required: true,
  })
  snapshot!: Record<string, any>;

  @ApiProperty({
    description: 'The timestamp when the action was performed.',
    required: true,
  })
  createdAt!: Date;

  static fromDomain(source: AuditLog): AuditLogDto {
    const result = new AuditLogDto();
    result.id = source.id;
    result.entityType = source.entityType;
    result.entityId = source.entityId;
    result.action = source.action;
    result.userId = source.userId;
    result.userName = source.userName;
    result.snapshot = source.snapshot;
    result.createdAt = source.createdAt;
    return result;
  }
}

export class AuditLogsDto {
  @ApiProperty({
    description: 'The audit log entries.',
    required: true,
    type: [AuditLogDto],
  })
  items!: AuditLogDto[];

  @ApiProperty({
    description: 'The total number of audit log entries.',
    required: true,
  })
  total!: number;

  static fromDomain(source: AuditLog[], total: number): AuditLogsDto {
    const result = new AuditLogsDto();
    result.items = source.map(AuditLogDto.fromDomain);
    result.total = total;
    return result;
  }
}
