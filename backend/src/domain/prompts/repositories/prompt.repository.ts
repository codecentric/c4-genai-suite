import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromptEntity } from '../../database';
import { InternalError, NotFoundError } from '../../shared/errors/domain.errors';
import { failure, Result, success } from '../../shared/types/result.type';
import { PromptFilters } from '../interfaces';
import { IPromptRepository } from './prompt.repository.interface';

@Injectable()
export class PromptRepository implements IPromptRepository {
  constructor(
    @InjectRepository(PromptEntity)
    private readonly repository: Repository<PromptEntity>,
  ) {}

  async findById(id: number): Promise<Result<PromptEntity | null>> {
    try {
      const prompt = await this.repository.findOne({ where: { id } });
      return success(prompt);
    } catch (error) {
      return failure(new InternalError('Failed to find prompt by ID', { id, error }));
    }
  }

  async findByIdWithRelations(id: number): Promise<Result<PromptEntity | null>> {
    try {
      const prompt = await this.repository.findOne({
        where: { id },
        relations: ['author', 'category', 'originalPrompt', 'ratings'],
      });
      return success(prompt);
    } catch (error) {
      return failure(new InternalError('Failed to find prompt with relations', { id, error }));
    }
  }

  async findAll(): Promise<Result<PromptEntity[]>> {
    try {
      const prompts = await this.repository.find({
        relations: ['author', 'category'],
      });
      return success(prompts);
    } catch (error) {
      return failure(new InternalError('Failed to find all prompts', { error }));
    }
  }

  async findWithPagination(
    page: number,
    limit: number,
    filters?: Record<string, unknown>,
  ): Promise<Result<{ items: PromptEntity[]; total: number; page: number; limit: number }>> {
    try {
      const queryBuilder = this.repository
        .createQueryBuilder('prompt')
        .leftJoinAndSelect('prompt.author', 'author')
        .leftJoinAndSelect('prompt.category', 'category')
        .leftJoinAndSelect('prompt.originalPrompt', 'originalPrompt');

      // Apply filters if provided
      if (filters) {
        const promptFilters = filters as PromptFilters;

        if (promptFilters.categoryId) {
          queryBuilder.andWhere('prompt.categoryId = :categoryId', { categoryId: promptFilters.categoryId });
        }

        if (promptFilters.authorId) {
          queryBuilder.andWhere('prompt.authorId = :authorId', { authorId: promptFilters.authorId });
        }

        if (promptFilters.isPublic !== undefined) {
          queryBuilder.andWhere('prompt.isPublic = :isPublic', { isPublic: promptFilters.isPublic });
        }

        if (promptFilters.search) {
          queryBuilder.andWhere(
            '(prompt.title ILIKE :search OR prompt.description ILIKE :search OR prompt.content ILIKE :search)',
            { search: `%${promptFilters.search}%` },
          );
        }

        if (promptFilters.minRating !== undefined) {
          queryBuilder.andWhere('prompt.averageRating >= :minRating', { minRating: promptFilters.minRating });
        }
      }

      // Apply pagination
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      // Apply default sorting
      queryBuilder.orderBy('prompt.createdAt', 'DESC');

      const [items, total] = await queryBuilder.getManyAndCount();

      return success({ items, total, page, limit });
    } catch (error) {
      return failure(new InternalError('Failed to find prompts with pagination', { page, limit, filters, error }));
    }
  }

  async findByAuthor(authorId: string): Promise<Result<PromptEntity[]>> {
    try {
      const prompts = await this.repository.find({
        where: { authorId },
        relations: ['author', 'category'],
        order: { createdAt: 'DESC' },
      });
      return success(prompts);
    } catch (error) {
      return failure(new InternalError('Failed to find prompts by author', { authorId, error }));
    }
  }

  async findPublic(): Promise<Result<PromptEntity[]>> {
    try {
      const prompts = await this.repository.find({
        where: { isPublic: true },
        relations: ['author', 'category'],
        order: { createdAt: 'DESC' },
      });
      return success(prompts);
    } catch (error) {
      return failure(new InternalError('Failed to find public prompts', { error }));
    }
  }

  async findWithFilters(filters: PromptFilters): Promise<Result<PromptEntity[]>> {
    try {
      const queryBuilder = this.repository
        .createQueryBuilder('prompt')
        .leftJoinAndSelect('prompt.author', 'author')
        .leftJoinAndSelect('prompt.category', 'category');

      if (filters.categoryId) {
        queryBuilder.andWhere('prompt.categoryId = :categoryId', { categoryId: filters.categoryId });
      }

      if (filters.authorId) {
        queryBuilder.andWhere('prompt.authorId = :authorId', { authorId: filters.authorId });
      }

      if (filters.isPublic !== undefined) {
        queryBuilder.andWhere('prompt.isPublic = :isPublic', { isPublic: filters.isPublic });
      }

      if (filters.search) {
        queryBuilder.andWhere(
          '(prompt.title ILIKE :search OR prompt.description ILIKE :search OR prompt.content ILIKE :search)',
          { search: `%${filters.search}%` },
        );
      }

      if (filters.minRating !== undefined) {
        queryBuilder.andWhere('prompt.averageRating >= :minRating', { minRating: filters.minRating });
      }

      queryBuilder.orderBy('prompt.createdAt', 'DESC');

      const prompts = await queryBuilder.getMany();
      return success(prompts);
    } catch (error) {
      return failure(new InternalError('Failed to find prompts with filters', { filters, error }));
    }
  }

  async save(entity: PromptEntity): Promise<Result<PromptEntity>> {
    try {
      const savedPrompt = await this.repository.save(entity);
      return success(savedPrompt);
    } catch (error) {
      return failure(new InternalError('Failed to save prompt', { entity, error }));
    }
  }

  async delete(id: number): Promise<Result<void>> {
    try {
      const result = await this.repository.delete(id);
      if (result.affected === 0) {
        return failure(new NotFoundError('Prompt not found', { id }));
      }
      return success(undefined);
    } catch (error) {
      return failure(new InternalError('Failed to delete prompt', { id, error }));
    }
  }

  async updateRatingStats(promptId: number, averageRating: number, ratingCount: number): Promise<Result<void>> {
    try {
      await this.repository.update(promptId, { averageRating, ratingCount });
      return success(undefined);
    } catch (error) {
      return failure(new InternalError('Failed to update rating stats', { promptId, averageRating, ratingCount, error }));
    }
  }

  async incrementUsageCount(promptId: number): Promise<Result<void>> {
    try {
      await this.repository.increment({ id: promptId }, 'usageCount', 1);
      return success(undefined);
    } catch (error) {
      return failure(new InternalError('Failed to increment usage count', { promptId, error }));
    }
  }
}
