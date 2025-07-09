export { CreateTaskDto } from './create-task.dto';
export { CreateTaskCategoryDto } from './create-task-category.dto';

// Re-export interfaces that are still used
export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: Date;
  assigneeId?: string;
  categoryId?: number;
}

export interface UpdateTaskCategoryDto {
  name?: string;
  description?: string;
  color?: string;
  sortOrder?: number;
}
