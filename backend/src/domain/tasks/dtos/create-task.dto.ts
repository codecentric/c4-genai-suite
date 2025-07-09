import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { TaskPriority, TaskStatus } from '../../database/entities/task';

export class CreateTaskDto {
  @IsString()
  @Length(1, 200, { message: 'Title must be between 1 and 200 characters' })
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Description must not exceed 2000 characters' })
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus, { message: 'Status must be a valid task status' })
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority, { message: 'Priority must be a valid task priority' })
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString({}, { message: 'Due date must be a valid date string' })
  dueDate?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Category ID must be a number' })
  categoryId?: number;
}
