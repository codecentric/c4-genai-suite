import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { schema } from '../typeorm.helper';
import { VisibilityType } from 'src/domain/prompt/interfaces';

@Entity({ name: 'prompt-categories', schema })
export class PromptCategoryEntity {
  @PrimaryGeneratedColumn()
  id!: string;

  @Column({ nullable: true })
  label!: string;

  @Column()
  description?: string;

  @Column()
  creationDate!: Date;

  @Column()
  visibility!: VisibilityType;
}
