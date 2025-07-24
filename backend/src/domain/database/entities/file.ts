import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Repository,
  UpdateDateColumn,
} from 'typeorm';
import { schema } from '../typeorm.helper';
import { BlobEntity } from './blob';
import { BucketEntity } from './bucket';
import { ConversationEntity } from './conversation';
import { ExtensionEntity } from './extension';
import { UserEntity } from './user';

export type FileRepository = Repository<FileEntity>;

export enum FileUploadStatus {
  // file upload to rag service is in progress
  InProgress = 'inProgress',
  // file upload to rag service was completed successfully
  Successful = 'successful',
}

@Entity({ name: 'files', schema })
export class FileEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  mimeType!: string;

  @Column()
  fileSize!: number;

  @Column()
  fileName!: string;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'CASCADE' })
  user!: UserEntity | null;

  @Column({ nullable: true })
  userId?: string;

  @ManyToOne(() => BucketEntity, { onDelete: 'CASCADE' })
  bucket?: BucketEntity;

  @Column({ nullable: true })
  bucketId?: number;

  @ManyToOne(() => ExtensionEntity, { onDelete: 'SET NULL' })
  extension?: ExtensionEntity;

  @Column({ nullable: true })
  extensionId?: number;

  @OneToMany(() => BlobEntity, (blob) => blob.file, { cascade: true })
  blobs!: BlobEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => ConversationEntity, { onDelete: 'CASCADE' })
  conversation?: ConversationEntity;

  @Column({ nullable: true })
  conversationId?: number;

  @Column()
  uploadStatus!: FileUploadStatus;

  @Column({ type: 'int', name: 'docId' })
  externalDocumentId!: number;
}
