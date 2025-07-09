import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, Repository, UpdateDateColumn } from 'typeorm';
import { PromptEntity } from './prompt';

export type PromptCategoryRepository = Repository<PromptCategoryEntity>;

@Entity({ name: 'prompt_categories' })
export class PromptCategoryEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100, unique: true })
  name!: string;

  @Column({ length: 500, nullable: true })
  description?: string;

  @Column({ length: 7, nullable: true })
  color?: string; // Hex color code for UI

  @Column({ default: 0 })
  sortOrder!: number;

  @OneToMany(() => PromptEntity, (prompt) => prompt.category)
  prompts!: PromptEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
