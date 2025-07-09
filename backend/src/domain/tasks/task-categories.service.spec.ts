import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskCategoryEntity } from '../database/entities/task-category';
import { CreateTaskCategoryDto, UpdateTaskCategoryDto } from './interfaces';
import { TaskCategoriesService } from './task-categories.service';

describe('TaskCategoriesService', () => {
  let service: TaskCategoriesService;
  let repository: jest.Mocked<Repository<TaskCategoryEntity>>;

  const mockTaskCategory = {
    id: 1,
    name: 'Test Category',
    description: 'Test description',
    color: '#FF0000',
    sortOrder: 0,
    tasks: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as TaskCategoryEntity;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskCategoriesService,
        {
          provide: getRepositoryToken(TaskCategoryEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TaskCategoriesService>(TaskCategoriesService);
    repository = module.get(getRepositoryToken(TaskCategoryEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new task category', async () => {
      const createDto: CreateTaskCategoryDto = {
        name: 'Test Category',
        description: 'Test description',
        color: '#FF0000',
        sortOrder: 0,
      };

      repository.create.mockReturnValue(mockTaskCategory);
      repository.save.mockResolvedValue(mockTaskCategory);

      const result = await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.save).toHaveBeenCalledWith(mockTaskCategory);
      expect(result).toEqual(mockTaskCategory);
    });
  });

  describe('findAll', () => {
    it('should return all task categories', async () => {
      repository.find.mockResolvedValue([mockTaskCategory]);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        order: { sortOrder: 'ASC', name: 'ASC' },
        relations: ['tasks'],
      });
      expect(result).toEqual([mockTaskCategory]);
    });
  });

  describe('findOne', () => {
    it('should return a task category by id', async () => {
      repository.findOne.mockResolvedValue(mockTaskCategory);

      const result = await service.findOne(1);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['tasks'],
      });
      expect(result).toEqual(mockTaskCategory);
    });
  });

  describe('findByName', () => {
    it('should return a task category by name', async () => {
      repository.findOne.mockResolvedValue(mockTaskCategory);

      const result = await service.findByName('Test Category');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { name: 'Test Category' },
      });
      expect(result).toEqual(mockTaskCategory);
    });
  });

  describe('update', () => {
    it('should update a task category', async () => {
      const updateDto: UpdateTaskCategoryDto = {
        name: 'Updated Category',
        description: 'Updated description',
      };

      repository.findOne.mockResolvedValue(mockTaskCategory);
      repository.save.mockResolvedValue({ ...mockTaskCategory, ...updateDto });

      const result = await service.update(1, updateDto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(repository.save).toHaveBeenCalled();
      expect(result.name).toBe('Updated Category');
    });

    it('should throw error if category not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(1, { name: 'Updated' })).rejects.toThrow('Category not found');
    });
  });

  describe('delete', () => {
    it('should delete a task category', async () => {
      repository.delete.mockResolvedValue({ affected: 1, raw: {} });

      await service.delete(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw error if category not found', async () => {
      repository.delete.mockResolvedValue({ affected: 0, raw: {} });

      await expect(service.delete(1)).rejects.toThrow('Category not found');
    });
  });

  describe('getCategoriesWithTaskCount', () => {
    it('should return categories with task count', async () => {
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getRawAndEntities: jest.fn().mockResolvedValue({
          entities: [mockTaskCategory],
          raw: [{ taskCount: '5' }],
        }),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getCategoriesWithTaskCount();

      expect(result).toEqual([
        {
          ...mockTaskCategory,
          taskCount: 5,
        },
      ]);
    });
  });
});
