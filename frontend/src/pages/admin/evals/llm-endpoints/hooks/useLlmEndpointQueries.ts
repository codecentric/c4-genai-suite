import { useQuery } from '@tanstack/react-query';
import type { PluginFeature } from 'src/api/generated-eval';
import { useEvalApi } from 'src/api/state/apiEvalClient';

const PAGE_SIZE = 20;

/**
 * Query hook to fetch all LLM endpoints with pagination and search
 */
export function useLlmEndpoints(page: number, query?: string, supportedFeatures?: PluginFeature[]) {
  const evalApi = useEvalApi();
  const offset = page * PAGE_SIZE;

  return useQuery({
    queryKey: ['llmEndpoints', page, query, supportedFeatures],
    queryFn: () => evalApi.llmEndpoints.llmEndpointsGetAll(query || undefined, supportedFeatures || undefined, offset, PAGE_SIZE),
  });
}

/**
 * Query hook to fetch a single LLM endpoint by ID
 */
export function useLlmEndpoint(id?: string) {
  const evalApi = useEvalApi();

  return useQuery({
    queryKey: ['llmEndpoint', id],
    queryFn: () => evalApi.llmEndpoints.llmEndpointsGet(id!),
    enabled: !!id,
  });
}

/**
 * Query hook to fetch available LLM endpoint types
 */
export function useLlmEndpointTypes() {
  const evalApi = useEvalApi();

  return useQuery({
    queryKey: ['llmEndpointTypes'],
    queryFn: () => evalApi.llmEndpoints.llmEndpointsGetTypes(),
  });
}

export { PAGE_SIZE };
