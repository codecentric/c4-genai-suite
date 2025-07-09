import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, Repository, UpdateDateColumn } from 'typeorm';
import { schema } from '../typeorm.helper';
import { FileEntity } from './file';

export type BucketRepository = Repository<BucketEntity>;

export type BucketType = 'general' | 'user' | 'conversation';

export type FileSizeLimits = {
  general: number;
} & Record<string, number>;

@Entity({ name: 'bucket', schema })
export class BucketEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ nullable: true })
  indexName?: string;

  @Column()
  endpoint!: string;

  @Column({ nullable: true })
  headers?: string;

  /***
   * @description decides if user can self-manage files
   ***/
  @Column()
  isDefault!: boolean;

  @Column({ default: 20 })
  perUserQuota!: number;

  @OneToMany(() => FileEntity, (file) => file.bucket, { nullable: true, onDelete: 'CASCADE' })
  files!: Promise<FileEntity[]>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @Column('text', { nullable: true, array: true })
  allowedFileNameExtensions?: string[];

  @Column({
    type: 'enum',
    enum: ['general', 'user', 'conversation'],
    default: 'general',
  })
  type!: BucketType;

  @Column('json', { default: { general: 1, pdf: 10, pptx: 10 } })
  fileSizeLimits!: FileSizeLimits;
}
