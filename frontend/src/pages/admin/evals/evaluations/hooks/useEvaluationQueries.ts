import { useQuery } from '@tanstack/react-query';
import { useEvalApi } from 'src/api/state/apiEvalClient';

const PAGE_SIZE = 20;

/**
 * Query hook to fetch all evaluations with pagination, search, and date filtering
 */
export function useEvaluations(page: number, limit = PAGE_SIZE, query?: string, fromDate?: Date, toDate?: Date) {
  const evalApi = useEvalApi();
  const offset = (page - 1) * limit;

  return useQuery({
    queryKey: ['evaluations', page, limit, query, fromDate, toDate],
    queryFn: () =>
      evalApi.evaluations.evaluationsGetAll(query || undefined, fromDate || undefined, toDate || undefined, offset, limit),
  });
}

/**
 * Query hook to fetch a single evaluation by ID
 */
export function useEvaluation(id?: string) {
  const evalApi = useEvalApi();

  return useQuery({
    queryKey: ['evaluation', id],
    queryFn: () => evalApi.evaluations.evaluationsGet(id!),
    enabled: !!id,
  });
}

/**
 * Query hook to fetch detailed evaluation summary with metrics
 */
export function useEvaluationSummary(id?: string) {
  const evalApi = useEvalApi();

  return useQuery({
    queryKey: ['evaluationSummary', id],
    queryFn: () => evalApi.evaluations.evaluationsGetEvaluationDetailSummary(id!),
    enabled: !!id,
  });
}

export { PAGE_SIZE };
