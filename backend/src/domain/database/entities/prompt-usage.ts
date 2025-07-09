import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Repository } from 'typeorm';
import { PromptEntity } from './prompt';
import { UserEntity } from './user';

export type PromptUsageRepository = Repository<PromptUsageEntity>;

@Entity({ name: 'prompt_usages' })
export class PromptUsageEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => PromptEntity, (prompt) => prompt.usages, { onDelete: 'CASCADE' })
  prompt!: PromptEntity;

  @Column()
  promptId!: number;

  @ManyToOne(() => UserEntity, (user) => user.id, { onDelete: 'CASCADE' })
  user!: UserEntity;

  @Column()
  userId!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  usedAt!: Date;
}
