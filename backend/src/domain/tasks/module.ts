import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskCategoriesController } from '../../controllers/tasks/task-categories.controller';
import { TaskCategoryEntity } from '../database/entities/task-category';
import { PromptsModule } from '../prompts/module';
import { TaskCategoriesService } from './task-categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([TaskCategoryEntity]), PromptsModule],
  controllers: [TaskCategoriesController],
  providers: [TaskCategoriesService],
  exports: [TaskCategoriesService],
})
export class TasksModule {}
