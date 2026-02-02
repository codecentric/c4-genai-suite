import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import type { LLMEndpointCreate, LLMEndpointUpdate, LLMEndpointDelete, LLMEndpoint } from 'src/api/generated-eval';
import { useEvalApi } from 'src/api/state/apiEvalClient';
import { texts } from 'src/texts';
import { useLlmEndpointsStore } from '../state';

export const UNCHANGED_API_KEY = 'd1d04d4e-38b9-441c-a6e3-68fb1e18f0c0';

/**
 * Mutation hook for creating LLM endpoints
 */
export function useCreateLlmEndpoint() {
  const evalApi = useEvalApi();
  const queryClient = useQueryClient();
  const { updateEndpointInList } = useLlmEndpointsStore();

  return useMutation({
    mutationFn: (data: LLMEndpointCreate) => evalApi.llmEndpoints.llmEndpointsPost(data),
    onSuccess: (endpoint: LLMEndpoint) => {
      updateEndpointInList(endpoint);
      toast.success(texts.evals.llmEndpoint.createSuccess);
      queryClient.invalidateQueries({ queryKey: ['llmEndpoints'] });
    },
    onError: (error: any) => {
      console.error('Failed to create endpoint:', error);
      toast.error(texts.evals.llmEndpoint.createFailed);
    },
  });
}

/**
 * Mutation hook for updating LLM endpoints
 */
export function useUpdateLlmEndpoint() {
  const evalApi = useEvalApi();
  const queryClient = useQueryClient();
  const { updateEndpointInList } = useLlmEndpointsStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LLMEndpointUpdate }) => evalApi.llmEndpoints.llmEndpointsPatch(id, data),
    onSuccess: (endpoint: LLMEndpoint) => {
      updateEndpointInList(endpoint);
      toast.success(texts.evals.llmEndpoint.updateSuccess);
      queryClient.invalidateQueries({ queryKey: ['llmEndpoints'] });
      queryClient.invalidateQueries({ queryKey: ['llmEndpoint', endpoint.id] });
    },
    onError: (error: any) => {
      console.error('Failed to update endpoint:', error);

      // Handle version conflict (409)
      if (error?.status === 409) {
        toast.error(texts.evals.llmEndpoint.versionConflict);
      } else {
        toast.error(texts.evals.llmEndpoint.updateFailed);
      }
    },
  });
}

/**
 * Mutation hook for deleting LLM endpoints
 */
export function useDeleteLlmEndpoint() {
  const evalApi = useEvalApi();
  const queryClient = useQueryClient();
  const { removeEndpointFromList } = useLlmEndpointsStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LLMEndpointDelete }) => evalApi.llmEndpoints.llmEndpointsDelete(id, data),
    onSuccess: (_, variables) => {
      removeEndpointFromList(variables.id);
      toast.success(texts.evals.llmEndpoint.deleteSuccess);
      queryClient.invalidateQueries({ queryKey: ['llmEndpoints'] });
    },
    onError: (error: any) => {
      console.error('Failed to delete endpoint:', error);

      // Handle version conflict (409)
      if (error?.status === 409) {
        toast.error(texts.evals.llmEndpoint.versionConflict);
      } else {
        toast.error(texts.evals.llmEndpoint.deleteFailed);
      }
    },
  });
}
