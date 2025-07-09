import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, Repository, UpdateDateColumn } from 'typeorm';
import { TaskEntity } from './task';

export type TaskCategoryRepository = Repository<TaskCategoryEntity>;

@Entity({ name: 'task_categories' })
export class TaskCategoryEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100, unique: true })
  name!: string;

  @Column({ length: 500, nullable: true })
  description?: string;

  @Column({ length: 7, nullable: true })
  color?: string; // Hex color code for UI

  @Column({ name: 'sort_order', default: 0 })
  sortOrder!: number;

  @OneToMany(() => TaskEntity, (task) => task.category)
  tasks!: TaskEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
