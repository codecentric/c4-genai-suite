import { Module } from '@nestjs/common';
import { TasksModule } from '../../domain/tasks/module';
import { TaskCategoriesController } from './task-categories.controller';

@Module({
  imports: [TasksModule],
  controllers: [TaskCategoriesController],
})
export class TasksControllerModule {}
