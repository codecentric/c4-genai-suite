import { Column, Entity, ManyToOne, PrimaryColumn, Repository } from 'typeorm';
import { schema } from '../typeorm.helper';
import { FileEntity } from './file';
import { UserEntity } from './user';

export type BlobRepository = Repository<BlobEntity>;

export enum BlobCategory {
  FILE_ORIGINAL = 'original',
  FILE_PROCESSED = 'processed',
  LLM_IMAGE = 'llm_image',
  LOGO = 'logo',
}

@Entity({ name: 'blobs', schema })
export class BlobEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  type!: string;

  @Column('text')
  buffer!: string;

  @Column({
    type: 'enum',
    enum: BlobCategory,
    default: BlobCategory.LLM_IMAGE,
    nullable: false,
  })
  category!: BlobCategory;

  @ManyToOne(() => FileEntity, { onDelete: 'CASCADE' })
  file?: FileEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'CASCADE' })
  user!: UserEntity | null;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  fileId?: number;
}
