import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Source } from 'src/domain/chat';
import { schema } from '../typeorm.helper';
import { ConfigurationEntity } from './configuration';
import { ConversationEntity } from './conversation';
import { ConversationFileEntity } from './conversation-file';

export type ExtensionSource = Source & { extensionExternalId: string };

@Entity({ name: 'messages', schema })
export class MessageEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  type!: string;

  @Column('simple-json')
  data!: any;

  @Column({ nullable: true })
  rating?: string;

  @Column({ nullable: true })
  error?: string;

  @Column('simple-json', { nullable: true })
  tools?: any;

  @Column()
  configurationId!: number;

  @ManyToOne(() => ConfigurationEntity)
  @JoinColumn({ name: 'configurationId' })
  configuration!: ConfigurationEntity;

  @Column('simple-json', { nullable: true })
  debug?: any;

  @Column('json', { nullable: true })
  sources?: ExtensionSource[];

  @Column('json', { nullable: true })
  sourcesOriginal?: Record<string, any>[];

  @ManyToOne(() => ConversationEntity, (conversation) => conversation.messages, { onDelete: 'CASCADE' })
  conversation!: ConversationEntity;

  @Column({ nullable: true })
  parentId?: number;

  @ManyToOne(() => MessageEntity, (message) => message.children, { onDelete: 'CASCADE', nullable: true })
  parent?: MessageEntity;

  @OneToMany(() => MessageEntity, (message) => message.parent, { onDelete: 'CASCADE', cascade: true })
  children!: MessageEntity[];

  @Column()
  conversationId!: number;

  @OneToMany(() => ConversationFileEntity, (cf) => cf.message)
  files!: ConversationFileEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
