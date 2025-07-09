import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
  Repository,
  UpdateDateColumn,
} from 'typeorm';
import { ChatSuggestion } from 'src/domain/shared';
import { schema } from '../typeorm.helper';
import { ConfigurationUserEntity } from './configuration-user';
import { ConversationEntity } from './conversation';
import { ExtensionEntity } from './extension';
import { UserGroupEntity } from './user-group';

export type ConfigurationRepository = Repository<ConfigurationEntity>;

@Entity({ name: 'configurations', schema })
export class ConfigurationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ default: '' })
  description!: string;

  @Column()
  enabled!: boolean;

  @Column('text', { nullable: true })
  agentName?: string;

  @Column('text', { nullable: true })
  chatFooter?: string;

  @Column('json', { nullable: true })
  chatSuggestions?: ChatSuggestion[];

  @Column('text', { nullable: true })
  executorEndpoint?: string;

  @Column('text', { nullable: true })
  executorHeaders?: string;

  @OneToMany(() => ConversationEntity, (conversation) => conversation.configuration, { onDelete: 'SET NULL' })
  conversations!: ConversationEntity[];

  @OneToMany(() => ExtensionEntity, (conversation) => conversation.configuration, { cascade: ['insert', 'update', 'remove'] })
  extensions!: ExtensionEntity[];

  @ManyToMany(() => UserGroupEntity, (userGroup) => userGroup.configurations)
  @JoinTable()
  userGroups!: UserGroupEntity[];

  @OneToMany(() => ConfigurationUserEntity, (uc) => uc.configuration)
  users!: ConfigurationUserEntity[];

  @RelationId('userGroups')
  userGroupsIds!: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
