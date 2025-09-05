import { Column, Entity, PrimaryColumn } from 'typeorm';
import { VisibilityType } from '../../prompt';
import { schema } from '../typeorm.helper';

@Entity({ name: 'prompt-categories', schema })
export class PromptCategoryEntity {
  @PrimaryColumn()
  label!: string;

  @Column()
  description?: string;

  @Column()
  creationDate!: Date;

  @Column()
  visibility!: VisibilityType;
}
