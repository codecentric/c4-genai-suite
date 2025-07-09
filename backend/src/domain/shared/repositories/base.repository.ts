import { Result } from '../types/result.type';

export interface BaseRepository<T, ID = number> {
  findById(id: ID): Promise<Result<T | null>>;
  findAll(): Promise<Result<T[]>>;
  save(entity: T): Promise<Result<T>>;
  delete(id: ID): Promise<Result<void>>;
}

export interface PaginatedRepository<T, ID = number> extends BaseRepository<T, ID> {
  findWithPagination(
    page: number,
    limit: number,
    filters?: Record<string, unknown>,
  ): Promise<Result<{ items: T[]; total: number; page: number; limit: number }>>;
}
