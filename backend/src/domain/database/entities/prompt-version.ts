import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Repository } from 'typeorm';
import { PromptEntity } from './prompt';
import { UserEntity } from './user';

export type PromptVersionRepository = Repository<PromptVersionEntity>;

@Entity({ name: 'prompt_versions' })
export class PromptVersionEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'prompt_id' })
  promptId!: number;

  @ManyToOne(() => PromptEntity, (prompt) => prompt.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prompt_id' })
  prompt!: PromptEntity;

  @Column({ name: 'version_number' })
  versionNumber!: number;

  @Column({ length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'version_comment', type: 'text' })
  versionComment!: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId?: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'created_by' })
  createdBy!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  author!: UserEntity;

  @Column({ name: 'is_current', default: false })
  isCurrent!: boolean;
}
