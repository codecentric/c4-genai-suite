import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { VisibilityType } from '../../prompt';
import { schema } from '../typeorm.helper';
import { PromptCategoryEntity } from './prompt-category';

@Entity({ name: 'prompts', schema })
export class PromptEntity {
  @PrimaryGeneratedColumn()
  id!: string;

  @Column({ nullable: true })
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
  raiting!: number;
}
