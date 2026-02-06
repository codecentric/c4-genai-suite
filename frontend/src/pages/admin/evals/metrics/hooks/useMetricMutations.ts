import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import type { MetricCreate, MetricUpdate, MetricDelete, Metric } from 'src/api/generated-eval';
import { useEvalApi } from 'src/api/state/apiEvalClient';
import { texts } from 'src/texts';
import { useMetricsStore } from '../state';

/**
 * Mutation hook for creating metrics
 */
export function useCreateMetric() {
  const evalApi = useEvalApi();
  const queryClient = useQueryClient();
  const { updateMetricInList } = useMetricsStore();

  return useMutation({
    mutationFn: (data: MetricCreate) => evalApi.metrics.metricsPost(data),
    onSuccess: (metric: Metric) => {
      updateMetricInList(metric);
      toast.success(texts.evals.metric.createSuccess);
      void queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
    onError: (error: unknown) => {
      console.error('Failed to create metric:', error);
      toast.error(texts.evals.metric.createFailed);
    },
  });
}

/**
 * Mutation hook for updating metrics
 */
export function useUpdateMetric() {
  const evalApi = useEvalApi();
  const queryClient = useQueryClient();
  const { updateMetricInList } = useMetricsStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MetricUpdate }) => evalApi.metrics.metricsPatch(id, data),
    onSuccess: (metric: Metric) => {
      updateMetricInList(metric);
      toast.success(texts.evals.metric.updateSuccess);
      void queryClient.invalidateQueries({ queryKey: ['metrics'] });
      void queryClient.invalidateQueries({ queryKey: ['metric', metric.id] });
    },
    onError: (error: unknown) => {
      console.error('Failed to update metric:', error);

      // Handle version conflict (409)
      if (error && typeof error === 'object' && 'status' in error && error.status === 409) {
        toast.error(texts.evals.metric.versionConflict);
      } else {
        toast.error(texts.evals.metric.updateFailed);
      }
    },
  });
}

/**
 * Mutation hook for deleting metrics
 */
export function useDeleteMetric() {
  const evalApi = useEvalApi();
  const queryClient = useQueryClient();
  const { removeMetricFromList } = useMetricsStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MetricDelete }) => evalApi.metrics.metricsDelete(id, data),
    onSuccess: (_, variables) => {
      removeMetricFromList(variables.id);
      toast.success(texts.evals.metric.deleteSuccess);
      void queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
    onError: (error: unknown) => {
      console.error('Failed to delete metric:', error);

      // Handle version conflict (409)
      if (error && typeof error === 'object' && 'status' in error && error.status === 409) {
        toast.error(texts.evals.metric.versionConflict);
      } else {
        toast.error(texts.evals.metric.deleteFailed);
      }
    },
  });
}
