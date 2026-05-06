import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import type {
  Dto,
  EvaluationDelete,
  EvaluationUpdate,
  LlmEvalEvalEvaluationsModelsEvaluationResult,
} from 'src/api/generated-eval';
import { useEvalApi } from 'src/api/state/apiEvalClient';
import { texts } from 'src/texts';

/**
 * Mutation hook for creating evaluations
 * Supports both QA catalog-based and manual test case-based evaluations
 */
export function useCreateEvaluation() {
  const evalApi = useEvalApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Dto) => evalApi.evaluations.evaluationsPost(data, undefined, undefined, undefined),
    onSuccess: (_evaluation: LlmEvalEvalEvaluationsModelsEvaluationResult) => {
      // Note: The API returns EvaluationResult, but we need GetAllEvaluationResult for the list
      // We'll rely on query invalidation to fetch the updated list
      toast.success(texts.evals.evaluations.createSuccess);
      void queryClient.invalidateQueries({ queryKey: ['evaluations'] });
    },
    onError: (error: unknown) => {
      console.error('Failed to create evaluation:', error);
      toast.error(texts.evals.evaluations.createFailed);
    },
  });
}

/**
 * Mutation hook for updating evaluation name
 * Note: Per API limitation, only name can be updated
 */
export function useUpdateEvaluation() {
  const evalApi = useEvalApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EvaluationUpdate }) =>
      evalApi.evaluations.evaluationsPatch(id, data, undefined, undefined, undefined),
    onSuccess: (evaluation: LlmEvalEvalEvaluationsModelsEvaluationResult) => {
      toast.success(texts.evals.evaluations.updateSuccess);
      // Invalidate both the single evaluation and the summary
      void queryClient.invalidateQueries({ queryKey: ['evaluation', evaluation.id] });
      void queryClient.invalidateQueries({ queryKey: ['evaluationSummary', evaluation.id] });
      void queryClient.invalidateQueries({ queryKey: ['evaluations'] });
    },
    onError: (error: unknown) => {
      console.error('Failed to update evaluation:', error);

      // Handle version conflict (409)
      if (error && typeof error === 'object' && 'status' in error && error.status === 409) {
        toast.error(texts.evals.evaluations.versionConflict);
      } else {
        toast.error(texts.evals.evaluations.updateFailed);
      }
    },
  });
}

/**
 * Mutation hook for soft-deleting evaluations
 */
export function useDeleteEvaluation() {
  const evalApi = useEvalApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EvaluationDelete }) => evalApi.evaluations.evaluationsDelete(id, data),
    onSuccess: () => {
      toast.success(texts.evals.evaluations.deleteSuccess);
      void queryClient.invalidateQueries({ queryKey: ['evaluations'] });
    },
    onError: (error: unknown) => {
      console.error('Failed to delete evaluation:', error);

      // Handle version conflict (409)
      if (error && typeof error === 'object' && 'status' in error && error.status === 409) {
        toast.error(texts.evals.evaluations.versionConflict);
      } else {
        toast.error(texts.evals.evaluations.deleteFailed);
      }
    },
  });
}

/**
 * Mutation hook for exporting evaluation results as CSV
 */
export function useExportEvaluationResults() {
  const evalApi = useEvalApi();

  return useMutation({
    mutationFn: (evaluationId: string) => evalApi.evaluations.evaluationsGetResultsExport(evaluationId),
    onSuccess: (csvData: string, evaluationId: string) => {
      // Create a blob from the CSV data and trigger download
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `evaluation-${evaluationId}-results.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(texts.evals.evaluations.exportSuccess);
    },
    onError: (error: unknown) => {
      console.error('Failed to export evaluation results:', error);
      toast.error(texts.evals.evaluations.exportFailed);
    },
  });
}
