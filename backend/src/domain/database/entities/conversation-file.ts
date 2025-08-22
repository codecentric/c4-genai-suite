import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Repository, Unique } from 'typeorm';
import { schema } from '../typeorm.helper';
import { ConversationEntity } from './conversation';
import { FileEntity } from './file';
import { MessageEntity } from './message';

export type ConversationFileRepository = Repository<ConversationFileEntity>;

@Entity({ name: 'conversations_files', schema })
@Unique(['conversationId', 'fileId'])
export class ConversationFileEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ConversationEntity, (conversation) => conversation.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation!: ConversationEntity;

  @Column({ nullable: false })
  conversationId!: number;

  @ManyToOne(() => FileEntity, (user) => user.conversations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileId' })
  file!: FileEntity;

  @Column({ nullable: false })
  fileId!: number;

  @ManyToOne(() => MessageEntity, (message) => message.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message?: MessageEntity;

  @Column({ nullable: true })
  messageId?: number;
}
