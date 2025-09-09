import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { VisibilityType } from '../../prompt/interfaces';
import { schema } from '../typeorm.helper';
import { PromptCategoryEntity } from './prompt-category';

@Entity({ name: 'prompts', schema })
export class PromptEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: false })
  title!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: false })
  content!: string;

  @ManyToMany(() => PromptCategoryEntity)
  @JoinTable()
  categories?: PromptCategoryEntity[];

  @Column()
  visibility!: VisibilityType;

  @Column({ nullable: true })
  rating!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
