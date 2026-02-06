import { useQuery } from '@tanstack/react-query';
import { useEvalApi } from 'src/api/state/apiEvalClient';

const PAGE_SIZE = 20;

/**
 * Query hook to fetch all metrics with pagination
 */
export function useMetrics(page: number, query?: string) {
  const evalApi = useEvalApi();
  const offset = page * PAGE_SIZE;

  return useQuery({
    queryKey: ['metrics', page, query],
    queryFn: () => evalApi.metrics.metricsGetAll(offset, PAGE_SIZE),
  });
}

/**
 * Query hook to fetch a single metric by ID
 */
export function useMetric(id?: string) {
  const evalApi = useEvalApi();

  return useQuery({
    queryKey: ['metric', id],
    queryFn: () => evalApi.metrics.metricsGet(id!),
    enabled: !!id,
  });
}

/**
 * Query hook to fetch available metric types
 */
export function useMetricTypes() {
  const evalApi = useEvalApi();

  return useQuery({
    queryKey: ['metricTypes'],
    queryFn: () => evalApi.metrics.metricsGetTypes(),
  });
}

export { PAGE_SIZE };
