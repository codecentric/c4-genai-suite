/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EvaluationDetailSummary, GetAllEvaluationResult } from 'src/api/generated-eval';
import { useEvalApi } from 'src/api/state/apiEvalClient';
import { useEvaluation, useEvaluations, useEvaluationSummary } from './useEvaluationQueries';

vi.mock('src/api/state/apiEvalClient');

describe('useEvaluationQueries', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  const mockEvaluationsApi = {
    evaluationsGetAll: vi.fn(),
    evaluationsGet: vi.fn(),
    evaluationsGetEvaluationDetailSummary: vi.fn(),
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    vi.mocked(useEvalApi).mockReturnValue({
      evaluations: mockEvaluationsApi as any,
    } as any);

    vi.clearAllMocks();
  });

  describe('useEvaluations', () => {
    const mockEvaluations: GetAllEvaluationResult[] = [
      {
        id: '1',
        name: 'Test Evaluation 1',
        createdAt: new Date('2024-01-01'),
        catalog: null,
        metricResults: [],
        status: 'SUCCESS' as any,
        testCaseProgress: { done: 10, total: 10 },
        version: 1,
      },
      {
        id: '2',
        name: 'Test Evaluation 2',
        createdAt: new Date('2024-01-02'),
        catalog: null,
        metricResults: [],
        status: 'RUNNING' as any,
        testCaseProgress: { done: 5, total: 10 },
        version: 1,
      },
    ];

    it('should fetch evaluations with pagination', async () => {
      mockEvaluationsApi.evaluationsGetAll.mockResolvedValue(mockEvaluations);

      const { result } = renderHook(() => useEvaluations(1, 10), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockEvaluationsApi.evaluationsGetAll).toHaveBeenCalledWith(undefined, undefined, undefined, 0, 10);
      expect(result.current.data).toEqual(mockEvaluations);
    });

    it('should fetch evaluations with search query', async () => {
      mockEvaluationsApi.evaluationsGetAll.mockResolvedValue(mockEvaluations);

      const { result } = renderHook(() => useEvaluations(1, 10, 'test'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockEvaluationsApi.evaluationsGetAll).toHaveBeenCalledWith('test', undefined, undefined, 0, 10);
    });

    it('should fetch evaluations with date range', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      mockEvaluationsApi.evaluationsGetAll.mockResolvedValue(mockEvaluations);

      const { result } = renderHook(() => useEvaluations(1, 10, undefined, fromDate, toDate), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockEvaluationsApi.evaluationsGetAll).toHaveBeenCalledWith(undefined, fromDate, toDate, 0, 10);
    });

    it('should calculate offset from page number', async () => {
      mockEvaluationsApi.evaluationsGetAll.mockResolvedValue(mockEvaluations);

      const { result } = renderHook(() => useEvaluations(3, 20), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockEvaluationsApi.evaluationsGetAll).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        40, // (page 3 - 1) * 20
        20,
      );
    });
  });

  describe('useEvaluation', () => {
    const mockEvaluation = {
      id: '1',
      name: 'Test Evaluation',
      createdAt: new Date('2024-01-01'),
      catalog: null,
      metricResults: [],
      status: 'SUCCESS' as any,
      testCaseProgress: { done: 10, total: 10 },
      version: 1,
    };

    it('should fetch single evaluation by id', async () => {
      mockEvaluationsApi.evaluationsGet.mockResolvedValue(mockEvaluation);

      const { result } = renderHook(() => useEvaluation('1'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockEvaluationsApi.evaluationsGet).toHaveBeenCalledWith('1');
      expect(result.current.data).toEqual(mockEvaluation);
    });

    it('should not fetch when id is undefined', () => {
      const { result } = renderHook(() => useEvaluation(undefined), { wrapper });

      expect(result.current.data).toBeUndefined();
      expect(mockEvaluationsApi.evaluationsGet).not.toHaveBeenCalled();
    });
  });

  describe('useEvaluationSummary', () => {
    const mockSummary: EvaluationDetailSummary = {
      id: '1',
      name: 'Test Evaluation',
      createdAt: new Date('2024-01-01'),
      qaCatalog: null,
      metrics: [
        {
          id: 'm1',
          name: 'Accuracy',
          type: 'accuracy' as any,
        },
      ],
      metricResults: [],
      metricScores: [],
      status: 'SUCCESS' as any,
      testCaseProgress: { done: 10, total: 10 },
      version: 1,
    };

    it('should fetch evaluation detail summary', async () => {
      mockEvaluationsApi.evaluationsGetEvaluationDetailSummary.mockResolvedValue(mockSummary);

      const { result } = renderHook(() => useEvaluationSummary('1'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockEvaluationsApi.evaluationsGetEvaluationDetailSummary).toHaveBeenCalledWith('1');
      expect(result.current.data).toEqual(mockSummary);
    });

    it('should not fetch when id is undefined', () => {
      const { result } = renderHook(() => useEvaluationSummary(undefined), { wrapper });

      expect(result.current.data).toBeUndefined();
      expect(mockEvaluationsApi.evaluationsGetEvaluationDetailSummary).not.toHaveBeenCalled();
    });
  });
});
