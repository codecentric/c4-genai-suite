import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Repository,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { PromptEntity } from './prompt';
import { UserEntity } from './user';

export type PromptRatingRepository = Repository<PromptRatingEntity>;

@Entity({ name: 'prompt_ratings' })
@Unique(['promptId', 'userId']) // One rating per user per prompt
export class PromptRatingEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('int')
  rating!: number; // 1-5 stars

  @Column({ length: 1000, nullable: true })
  comment?: string;

  @ManyToOne(() => PromptEntity, (prompt) => prompt.ratings, { onDelete: 'CASCADE' })
  prompt!: PromptEntity;

  @Column()
  promptId!: number;

  @ManyToOne(() => UserEntity, (user) => user.id, { onDelete: 'CASCADE' })
  user!: UserEntity;

  @Column()
  userId!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
