import { BaseAPI, JSONApiResponse, RequestOpts, VoidApiResponse } from './generated/runtime';

export interface TaskCategory {
  id: number;
  name: string;
  description?: string;
  color?: string;
  sortOrder: number;
  taskCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskCategoryDto {
  name: string;
  description?: string;
  color?: string;
  sortOrder?: number;
}

export interface UpdateTaskCategoryDto {
  name?: string;
  description?: string;
  color?: string;
  sortOrder?: number;
}

export class TaskCategoriesApi extends BaseAPI {
  async getAll(): Promise<TaskCategory[]> {
    const requestOpts: RequestOpts = {
      path: '/api/task-categories',
      method: 'GET',
      headers: {},
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<TaskCategory[]>;
  }

  async getAllWithCounts(): Promise<TaskCategory[]> {
    const requestOpts: RequestOpts = {
      path: '/api/task-categories/with-counts',
      method: 'GET',
      headers: {},
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<TaskCategory[]>;
  }

  async getById(id: number): Promise<TaskCategory> {
    const requestOpts: RequestOpts = {
      path: `/api/task-categories/${id}`,
      method: 'GET',
      headers: {},
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<TaskCategory>;
  }

  async create(data: CreateTaskCategoryDto): Promise<TaskCategory> {
    const requestOpts: RequestOpts = {
      path: '/api/task-categories',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data,
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<TaskCategory>;
  }

  async update(id: number, data: UpdateTaskCategoryDto): Promise<TaskCategory> {
    const requestOpts: RequestOpts = {
      path: `/api/task-categories/${id}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data,
    };

    const response = await this.request(requestOpts);
    return new JSONApiResponse(response).value() as Promise<TaskCategory>;
  }

  async delete(id: number): Promise<void> {
    const requestOpts: RequestOpts = {
      path: `/api/task-categories/${id}`,
      method: 'DELETE',
      headers: {},
    };

    const response = await this.request(requestOpts);
    return new VoidApiResponse(response).value();
  }
}
