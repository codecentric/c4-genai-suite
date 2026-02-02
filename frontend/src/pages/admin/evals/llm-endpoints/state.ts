import { create } from 'zustand';
import type { LLMEndpoint } from 'src/api/generated-eval';

type LlmEndpointsState = {
  // List of endpoints for the list page
  endpoints: LLMEndpoint[];

  // Currently selected/viewed endpoint
  selectedEndpoint: LLMEndpoint | null;

  // Total count for pagination
  totalCount: number;
};

type LlmEndpointsActions = {
  // Set all endpoints (from list fetch)
  setEndpoints: (endpoints: LLMEndpoint[], totalCount?: number) => void;

  // Update a single endpoint in the list
  updateEndpointInList: (endpoint: LLMEndpoint) => void;

  // Remove an endpoint from the list
  removeEndpointFromList: (id: string) => void;

  // Set the currently selected endpoint
  setSelectedEndpoint: (endpoint: LLMEndpoint | null) => void;
};

const useLlmEndpointsStore_ = create<LlmEndpointsState & LlmEndpointsActions>()((set) => ({
  endpoints: [],
  selectedEndpoint: null,
  totalCount: 0,

  setEndpoints: (endpoints: LLMEndpoint[], totalCount?: number) => {
    return set({ endpoints, totalCount: totalCount ?? endpoints.length });
  },

  updateEndpointInList: (endpoint: LLMEndpoint) => {
    return set((state) => {
      const endpoints = [...state.endpoints];
      const index = endpoints.findIndex((e) => e.id === endpoint.id);
      if (index >= 0) {
        endpoints[index] = endpoint;
      } else {
        endpoints.push(endpoint);
      }
      return { endpoints };
    });
  },

  removeEndpointFromList: (id: string) => {
    return set((state) => ({
      endpoints: state.endpoints.filter((e) => e.id !== id),
      totalCount: Math.max(0, state.totalCount - 1),
    }));
  },

  setSelectedEndpoint: (endpoint: LLMEndpoint | null) => {
    return set({ selectedEndpoint: endpoint });
  },
}));

/**
 * Zustand store for LLM Endpoints state management.
 * Handles endpoint list, selected endpoint, and pagination.
 */
export const useLlmEndpointsStore = useLlmEndpointsStore_;
