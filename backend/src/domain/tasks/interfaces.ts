// Re-export DTOs from the dtos folder
export * from './dtos';

export interface TaskFilters {
  status?: string;
  priority?: string;
  categoryId?: number;
  assigneeId?: string;
  search?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'dueDate' | 'title' | 'priority';
  sortOrder?: 'ASC' | 'DESC';
}
