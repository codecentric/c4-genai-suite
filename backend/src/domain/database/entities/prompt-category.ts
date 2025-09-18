import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { VisibilityType } from '../../prompt/interfaces';
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

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
