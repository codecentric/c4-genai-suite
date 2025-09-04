import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { schema } from '../typeorm.helper';
import { VisibilityType } from 'src/domain/prompt/interfaces';
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

  @OneToMany(() => PromptEntity, (prompt) => prompt.categories)
  categories?: [string];

  @Column()
  visibility!: VisibilityType;

  @Column({ nullable: true })
  raiting!: number;
}
