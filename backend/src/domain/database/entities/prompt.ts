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
import { PromptCategoryEntity } from './prompt-category';
import { PromptRatingEntity } from './prompt-rating';
import { PromptUsageEntity } from './prompt-usage';
import { PromptVersionEntity } from './prompt-version';
import { UserEntity } from './user';

export type PromptRepository = Repository<PromptEntity>;

@Entity({ name: 'prompts' })
export class PromptEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 200 })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ length: 1000, nullable: true })
  description?: string;

  @Column({ name: 'isPublic', default: true })
  isPublic!: boolean;

  @Column({ name: 'originalPromptId', nullable: true })
  originalPromptId?: number; // For cloned prompts

  @Column({ name: 'usageCount', default: 0 })
  usageCount!: number;

  @Column({ name: 'averageRating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating!: number;

  @Column({ name: 'ratingCount', default: 0 })
  ratingCount!: number;

  @ManyToOne(() => UserEntity, (user) => user.id, { onDelete: 'CASCADE' })
  author!: UserEntity;

  @Column({ name: 'authorId' })
  authorId!: string;

  @ManyToOne(() => PromptCategoryEntity, (category) => category.prompts, { onDelete: 'SET NULL' })
  category?: PromptCategoryEntity;

  @Column({ name: 'categoryId', nullable: true })
  categoryId?: number;

  @ManyToOne(() => PromptEntity, (prompt) => prompt.id, { onDelete: 'SET NULL' })
  originalPrompt?: PromptEntity;

  @OneToMany(() => PromptRatingEntity, (rating) => rating.prompt)
  ratings!: PromptRatingEntity[];

  @OneToMany(() => PromptUsageEntity, (usage) => usage.prompt)
  usages!: PromptUsageEntity[];

  @OneToMany(() => PromptVersionEntity, (version) => version.prompt)
  versions!: PromptVersionEntity[];

  @Column({ name: 'current_version', default: 1 })
  currentVersion!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
