import { useQuery } from '@tanstack/react-query';
import { useEvalApi } from 'src/api/state/apiEvalClient';

const PAGE_SIZE = 20;

/**
 * Query hook to fetch grouped evaluation results with pagination
 * Returns results grouped by question/test case
 */
export function useGroupedResults(evaluationId?: string, page: number = 1, limit = PAGE_SIZE) {
  const evalApi = useEvalApi();
  const offset = (page - 1) * limit;

  return useQuery({
    queryKey: ['groupedResults', evaluationId, page, limit],
    queryFn: () => evalApi.evaluationResults.evaluationResultsGetGrouped(evaluationId, offset, limit),
    enabled: !!evaluationId,
  });
}

/**
 * Query hook to fetch a single evaluation result detail by ID
 */
export function useEvaluationResultDetail(resultId?: string) {
  const evalApi = useEvalApi();

  return useQuery({
    queryKey: ['evaluationResultDetail', resultId],
    queryFn: () => evalApi.evaluationResults.evaluationResultsGet(resultId!),
    enabled: !!resultId,
  });
}

export { PAGE_SIZE };
