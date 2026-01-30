import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { schema } from '../typeorm.helper';
import { ConfigurationEntity } from './configuration';
import { ConversationFileEntity } from './conversation-file';
import { MessageEntity } from './message';
import { UserEntity } from './user';

export type ConversationContext = Record<string, string>;

export type ExtensionUserArguments = Record<string, Record<string, any>>;

export type ConversationRating = 'good' | 'bad' | 'unrated';

@Entity({ name: 'conversations', schema })
// Used by GetConversationsHandler: find by userId, order by updatedAt DESC
// See: src/domain/chat/use-cases/get-conversations.ts
@Index(['userId', 'updatedAt'])
@Index(['configurationId'])
export class ConversationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true })
  name!: string;

  @Column({ default: false })
  isNameSetManually!: boolean;

  @Column({ nullable: true })
  llm?: string;

  @Column({ nullable: true })
  rating?: ConversationRating;

  @ManyToOne(() => ConfigurationEntity, (configuration) => configuration.conversations, { onDelete: 'SET NULL' })
  configuration!: ConfigurationEntity;

  @Column()
  configurationId!: number;

  @ManyToOne(() => UserEntity, (user) => user.conversations, { onDelete: 'CASCADE' })
  user!: UserEntity;

  @Column()
  userId!: string;

  @OneToMany(() => MessageEntity, (message) => message.conversation, { onDelete: 'CASCADE', cascade: true })
  messages!: MessageEntity[];

  @Column('json', { nullable: true })
  context?: ConversationContext;

  @Column('json', { nullable: true })
  extensionUserArguments?: ExtensionUserArguments;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => ConversationFileEntity, (cf) => cf.conversation)
  files!: ConversationFileEntity[];
}
