import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Repository,
  UpdateDateColumn,
} from 'typeorm';
import { ExtensionObjectArgument } from 'src/domain/extensions';
import { schema } from '../typeorm.helper';
import { ConfigurationEntity } from './configuration';

export type ExtensionRepository = Repository<ExtensionEntity>;

export type ExtensionState = {
  changes?: Record<string, any>[];
  changed?: boolean;
  [key: string]: any;
};

@Entity({ name: 'extensions', schema })
@Index(['configurationId'])
// Used to fetch enabled extensions for a configuration
// See: src/domain/extensions/use-cases/update-configuration-user-values.ts, get-bucket-availability.ts
@Index(['configurationId', 'enabled'])
export class ExtensionEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  externalId!: string;

  @Column()
  enabled!: boolean;

  @Column({ type: 'simple-json', nullable: true })
  state?: ExtensionState;

  @Column('jsonb')
  values!: Record<string, any>;

  @Column('simple-json', { nullable: true })
  configurableArguments?: ExtensionObjectArgument;

  @ManyToOne(() => ConfigurationEntity, (configuration) => configuration.conversations, { onDelete: 'CASCADE' })
  configuration!: ConfigurationEntity;

  @Column()
  configurationId!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
