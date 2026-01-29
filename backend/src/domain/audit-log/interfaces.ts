import { AuditAction, AuditEntityType } from '../database';

export interface AuditLog {
  id: number;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  userId: string;
  userName?: string;
  snapshot: Record<string, any>;
  createdAt: Date;
}
