import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskCategoryEntity } from '../database/entities/task-category';
import { CreateTaskCategoryDto, UpdateTaskCategoryDto } from './interfaces';

@Injectable()
export class TaskCategoriesService {
  constructor(
    @InjectRepository(TaskCategoryEntity)
    private readonly taskCategoryRepository: Repository<TaskCategoryEntity>,
  ) {}

  async create(createTaskCategoryDto: CreateTaskCategoryDto): Promise<TaskCategoryEntity> {
    const category = this.taskCategoryRepository.create(createTaskCategoryDto);
    return this.taskCategoryRepository.save(category);
  }

  async findAll(): Promise<TaskCategoryEntity[]> {
    return this.taskCategoryRepository.find({
      order: { sortOrder: 'ASC', name: 'ASC' },
      relations: ['tasks'],
    });
  }

  async findOne(id: number): Promise<TaskCategoryEntity | null> {
    return this.taskCategoryRepository.findOne({
      where: { id },
      relations: ['tasks'],
    });
  }

  async findByName(name: string): Promise<TaskCategoryEntity | null> {
    return this.taskCategoryRepository.findOne({
      where: { name },
    });
  }

  async update(id: number, updateTaskCategoryDto: UpdateTaskCategoryDto): Promise<TaskCategoryEntity> {
    const category = await this.taskCategoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    Object.assign(category, updateTaskCategoryDto);
    return this.taskCategoryRepository.save(category);
  }

  async delete(id: number): Promise<void> {
    const result = await this.taskCategoryRepository.delete(id);

    if (result.affected === 0) {
      throw new Error('Category not found');
    }
  }

  async getCategoriesWithTaskCount(): Promise<Array<TaskCategoryEntity & { taskCount: number }>> {
    const categories = await this.taskCategoryRepository
      .createQueryBuilder('category')
      .leftJoin('category.tasks', 'task')
      .addSelect('COUNT(task.id)', 'taskCount')
      .groupBy('category.id')
      .orderBy('category.sortOrder', 'ASC')
      .addOrderBy('category.name', 'ASC')
      .getRawAndEntities();

    return categories.entities.map((category, index) => ({
      ...category,
      taskCount: parseInt(String((categories.raw[index] as { taskCount: string })?.taskCount)) || 0,
    }));
  }
}
