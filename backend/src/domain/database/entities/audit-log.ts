import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Repository } from 'typeorm';
import { schema } from '../typeorm.helper';

export type AuditLogRepository = Repository<AuditLogEntity>;

export type AuditAction = 'create' | 'update' | 'delete';
export type AuditEntityType = 'extension' | 'bucket' | 'configuration' | 'settings' | 'userGroup' | 'user';

@Entity({ name: 'audit_log', schema })
export class AuditLogEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  entityType!: AuditEntityType;

  @Column()
  entityId!: string;

  @Column()
  action!: AuditAction;

  @Column()
  userId!: string;

  @Column({ nullable: true })
  userName?: string;

  @Column('jsonb')
  snapshot!: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
