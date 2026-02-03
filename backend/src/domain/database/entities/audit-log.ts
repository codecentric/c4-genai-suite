import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Repository } from 'typeorm';
import { schema } from '../typeorm.helper';

export type AuditLogRepository = Repository<AuditLogEntity>;

export type AuditAction = 'create' | 'update' | 'delete';
export type AuditEntityType = 'extension' | 'bucket' | 'configuration' | 'settings' | 'userGroup' | 'user';

@Entity({ name: 'audit_log', schema })
export class AuditLogEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column()
  entityType!: AuditEntityType;

  @Index()
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

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
