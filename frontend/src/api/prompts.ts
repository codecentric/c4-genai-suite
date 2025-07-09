import { BaseAPI, HTTPQuery, JSONApiResponse, RequestOpts, VoidApiResponse } from './generated/runtime';

export interface Prompt {
  id: number;
  title: string;
  content: string;
  description?: string;
  isPublic: boolean;
  originalPromptId?: number;
  usageCount: number;
  averageRating: number;
  ratingCount: number;
  authorId: string;
  categoryId?: number;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  category?: PromptCategory;
  originalPrompt?: Prompt;
}

export interface PromptCategory {
  id: number;
  name: string;
  description?: string;
  color?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  promptCount?: number;
}

export interface PromptRating {
  id: number;
  rating: number;
  comment?: string;
  promptId: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreatePromptDto {
  title: string;
  content: string;
  description?: string;
  categoryId?: number;
  isPublic?: boolean;
}

export interface UpdatePromptDto {
  title?: string;
  content?: string;
  description?: string;
  categoryId?: number;
  isPublic?: boolean;
  versionComment?: string;
}

export interface PromptVersion {
  id: number;
  promptId: number;
  versionNumber: number;
  title: string;
  description?: string;
  content: string;
  categoryId?: number;
  versionComment: string;
  createdAt: string;
  createdBy: string;
  isCurrent: boolean;
  author: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreatePromptRatingDto {
  rating: number;
  comment?: string;
}

export interface CreatePromptCategoryDto {
  name: string;
  description?: string;
  color?: string;
  sortOrder?: number;
}

export interface UpdatePromptCategoryDto {
  name?: string;
  description?: string;
  color?: string;
  sortOrder?: number;
}

export interface PromptFilters {
  categoryId?: number;
  search?: string;
  minRating?: number;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'averageRating' | 'usageCount' | 'title';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export class PromptsApi extends BaseAPI {
  // Prompts
  async getPrompts(filters?: PromptFilters): Promise<PaginatedResponse<Prompt>> {
    const query: HTTPQuery = {};
    if (filters?.categoryId) query.categoryId = filters.categoryId;
    if (filters?.search) query.search = filters.search;
    if (filters?.minRating !== undefined) query.minRating = filters.minRating;
    if (filters?.page) query.page = filters.page;
    if (filters?.limit) query.limit = filters.limit;
    if (filters?.sortBy) query.sortBy = filters.sortBy;
    if (filters?.sortOrder) query.sortOrder = filters.sortOrder;

    const requestOpts: RequestOpts = {
      path: '/api/prompts',
      method: 'GET',
      headers: {},
      query,
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<PaginatedResponse<Prompt>>;
  }

  async getMyPrompts(filters?: Omit<PromptFilters, 'categoryId'>): Promise<PaginatedResponse<Prompt>> {
    const query: HTTPQuery = {};
    if (filters?.search) query.search = filters.search;
    if (filters?.page) query.page = filters.page;
    if (filters?.limit) query.limit = filters.limit;
    if (filters?.sortBy) query.sortBy = filters.sortBy;
    if (filters?.sortOrder) query.sortOrder = filters.sortOrder;

    const requestOpts: RequestOpts = {
      path: '/api/prompts/my',
      method: 'GET',
      headers: {},
      query,
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<PaginatedResponse<Prompt>>;
  }

  async getPopularPrompts(limit?: number): Promise<Prompt[]> {
    const query: HTTPQuery = {};
    if (limit) query.limit = limit;

    const requestOpts: RequestOpts = {
      path: '/api/prompts/popular',
      method: 'GET',
      headers: {},
      query,
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<Prompt[]>;
  }

  async getRecentPrompts(limit?: number): Promise<Prompt[]> {
    const query: HTTPQuery = {};
    if (limit) query.limit = limit;

    const requestOpts: RequestOpts = {
      path: '/api/prompts/recent',
      method: 'GET',
      headers: {},
      query,
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<Prompt[]>;
  }

  async getPrompt(id: number): Promise<Prompt> {
    const requestOpts: RequestOpts = {
      path: `/api/prompts/${id}`,
      method: 'GET',
      headers: {},
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<Prompt>;
  }

  async createPrompt(data: CreatePromptDto): Promise<Prompt> {
    const requestOpts: RequestOpts = {
      path: '/api/prompts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data,
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<Prompt>;
  }

  async updatePrompt(id: number, data: UpdatePromptDto): Promise<Prompt> {
    const requestOpts: RequestOpts = {
      path: `/api/prompts/${id}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data,
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<Prompt>;
  }

  async deletePrompt(id: number): Promise<void> {
    const requestOpts: RequestOpts = {
      path: `/api/prompts/${id}`,
      method: 'DELETE',
      headers: {},
    };

    const response = await this.request(requestOpts);
    return new VoidApiResponse(response).value();
  }

  async clonePrompt(id: number, title?: string): Promise<Prompt> {
    const requestOpts: RequestOpts = {
      path: `/api/prompts/${id}/clone`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: { title },
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<Prompt>;
  }

  async usePrompt(id: number): Promise<void> {
    const requestOpts: RequestOpts = {
      path: `/api/prompts/${id}/use`,
      method: 'POST',
      headers: {},
    };

    const response = await this.request(requestOpts);
    return new VoidApiResponse(response).value();
  }

  // Categories
  async getCategories(): Promise<PromptCategory[]> {
    const requestOpts: RequestOpts = {
      path: '/api/prompt-categories',
      method: 'GET',
      headers: {},
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<PromptCategory[]>;
  }

  async getCategoriesWithCounts(): Promise<PromptCategory[]> {
    const requestOpts: RequestOpts = {
      path: '/api/prompt-categories/with-counts',
      method: 'GET',
      headers: {},
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<PromptCategory[]>;
  }

  async getCategory(id: number): Promise<PromptCategory> {
    const requestOpts: RequestOpts = {
      path: `/api/prompt-categories/${id}`,
      method: 'GET',
      headers: {},
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<PromptCategory>;
  }

  async createCategory(data: CreatePromptCategoryDto): Promise<PromptCategory> {
    const requestOpts: RequestOpts = {
      path: '/api/prompt-categories',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data,
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<PromptCategory>;
  }

  async updateCategory(id: number, data: UpdatePromptCategoryDto): Promise<PromptCategory> {
    const requestOpts: RequestOpts = {
      path: `/api/prompt-categories/${id}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data,
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<PromptCategory>;
  }

  async deleteCategory(id: number): Promise<void> {
    const requestOpts: RequestOpts = {
      path: `/api/prompt-categories/${id}`,
      method: 'DELETE',
      headers: {},
    };

    const response = await this.request(requestOpts);
    return new VoidApiResponse(response).value();
  }

  // Ratings
  async getRatings(promptId: number): Promise<PromptRating[]> {
    const requestOpts: RequestOpts = {
      path: `/api/prompts/${promptId}/ratings`,
      method: 'GET',
      headers: {},
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<PromptRating[]>;
  }

  async getMyRating(promptId: number): Promise<PromptRating> {
    const requestOpts: RequestOpts = {
      path: `/api/prompts/${promptId}/ratings/my`,
      method: 'GET',
      headers: {},
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<PromptRating>;
  }

  async getRatingStats(promptId: number): Promise<{
    averageRating: number;
    ratingCount: number;
    ratingDistribution: { [key: number]: number };
  }> {
    const requestOpts: RequestOpts = {
      path: `/api/prompts/${promptId}/ratings/stats`,
      method: 'GET',
      headers: {},
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<{
      averageRating: number;
      ratingCount: number;
      ratingDistribution: { [key: number]: number };
    }>;
  }

  async ratePrompt(promptId: number, data: CreatePromptRatingDto): Promise<PromptRating> {
    const requestOpts: RequestOpts = {
      path: `/api/prompts/${promptId}/ratings`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data,
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<PromptRating>;
  }

  async updateRating(promptId: number, data: CreatePromptRatingDto): Promise<PromptRating> {
    const requestOpts: RequestOpts = {
      path: `/api/prompts/${promptId}/ratings`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data,
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<PromptRating>;
  }

  async deleteRating(promptId: number): Promise<void> {
    const requestOpts: RequestOpts = {
      path: `/api/prompts/${promptId}/ratings`,
      method: 'DELETE',
      headers: {},
    };

    const response = await this.request(requestOpts);
    return new VoidApiResponse(response).value();
  }

  // Versioning
  async getPromptVersions(promptId: number): Promise<PromptVersion[]> {
    const requestOpts: RequestOpts = {
      path: `/api/prompts/${promptId}/versions`,
      method: 'GET',
      headers: {},
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<PromptVersion[]>;
  }

  async getPromptVersion(promptId: number, versionNumber: number): Promise<PromptVersion> {
    const requestOpts: RequestOpts = {
      path: `/api/prompts/${promptId}/versions/${versionNumber}`,
      method: 'GET',
      headers: {},
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<PromptVersion>;
  }

  async restorePromptVersion(promptId: number, versionNumber: number, versionComment: string): Promise<Prompt> {
    const requestOpts: RequestOpts = {
      path: `/api/prompts/${promptId}/restore/${versionNumber}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: { versionComment },
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<Prompt>;
  }

  async togglePromptVisibility(promptId: number, isPublic: boolean): Promise<Prompt> {
    const requestOpts: RequestOpts = {
      path: `/api/prompts/${promptId}/visibility`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: { isPublic },
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<Prompt>;
  }
}
