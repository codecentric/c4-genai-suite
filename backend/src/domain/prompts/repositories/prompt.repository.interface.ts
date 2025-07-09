import { PromptEntity, PromptRatingEntity, PromptUsageEntity, PromptVersionEntity } from '../../database';
import { PaginatedRepository } from '../../shared/repositories/base.repository';
import { Result } from '../../shared/types/result.type';
import { PromptFilters } from '../interfaces';

export interface IPromptRepository extends PaginatedRepository<PromptEntity> {
  findByAuthor(authorId: string): Promise<Result<PromptEntity[]>>;
  findPublic(): Promise<Result<PromptEntity[]>>;
  findWithFilters(filters: PromptFilters): Promise<Result<PromptEntity[]>>;
  findByIdWithRelations(id: number): Promise<Result<PromptEntity | null>>;
  updateRatingStats(promptId: number, averageRating: number, ratingCount: number): Promise<Result<void>>;
  incrementUsageCount(promptId: number): Promise<Result<void>>;
}

export interface IPromptUsageRepository {
  save(usage: PromptUsageEntity): Promise<Result<PromptUsageEntity>>;
  findByPrompt(promptId: number): Promise<Result<PromptUsageEntity[]>>;
  findByUser(userId: string): Promise<Result<PromptUsageEntity[]>>;
}

export interface IPromptRatingRepository {
  save(rating: PromptRatingEntity): Promise<Result<PromptRatingEntity>>;
  findByPrompt(promptId: number): Promise<Result<PromptRatingEntity[]>>;
  findByUserAndPrompt(userId: string, promptId: number): Promise<Result<PromptRatingEntity | null>>;
  getAverageRating(promptId: number): Promise<Result<{ averageRating: number; ratingCount: number }>>;
}

export interface IPromptVersionRepository {
  save(version: PromptVersionEntity): Promise<Result<PromptVersionEntity>>;
  findByPrompt(promptId: number): Promise<Result<PromptVersionEntity[]>>;
  findByPromptAndVersion(promptId: number, versionNumber: number): Promise<Result<PromptVersionEntity | null>>;
  markAsNotCurrent(promptId: number): Promise<Result<void>>;
}
