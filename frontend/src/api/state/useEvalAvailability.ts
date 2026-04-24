import { useQuery } from '@tanstack/react-query';

interface EvalStatusResponse {
  available: boolean;
}

/**
 * Hook to check whether the evaluation service feature is enabled.
 *
 * Calls `GET /api/eval/status` which returns `{ available: boolean }` based on
 * the backend's `EVAL_SERVICE_ENABLED` env var. The result is cached for 5 minutes
 * so repeated renders don't trigger additional requests.
 *
 * Used by `AdminPage` to conditionally show/hide the Evaluations sidebar section
 * and routes. When the eval service is not deployed, the entire UI section is
 * hidden from the admin panel.
 *
 * Falls back to `available: false` on network errors so the evals section
 * is hidden rather than broken when the backend is unreachable.
 */
export function useEvalAvailability(): { isEvalAvailable: boolean; isLoading: boolean } {
  const { data, isLoading } = useQuery<EvalStatusResponse>({
    queryKey: ['eval-service-status'],
    queryFn: async () => {
      const basePath = import.meta.env.VITE_SERVER_URL || '';
      const res = await fetch(`${basePath}/api/eval/status`, { credentials: 'include' });
      if (!res.ok) return { available: false };
      return (await res.json()) as EvalStatusResponse;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes — this is a deployment-time flag, not dynamic
    retry: false, // Don't retry — if the backend is down, hide evals gracefully
  });

  return {
    isEvalAvailable: data?.available ?? false,
    isLoading,
  };
}
