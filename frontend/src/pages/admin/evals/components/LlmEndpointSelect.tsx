import { Select } from '@mantine/core';
import type { SelectProps } from '@mantine/core';
import { useMemo } from 'react';
import type { PluginFeature } from 'src/api/generated-eval';
import { useLlmEndpoints } from 'src/pages/admin/evals/llm-endpoints/hooks/useLlmEndpointQueries';

interface LlmEndpointSelectProps extends Omit<SelectProps, 'data'> {
  /** Filter endpoints by supported features (e.g., ['CHAT']) */
  supportedFeatures?: PluginFeature[];
}

/**
 * Reusable select component for choosing LLM endpoints.
 * Fetches endpoints from the API and displays them in a dropdown.
 */
export function LlmEndpointSelect({ supportedFeatures, disabled, ...selectProps }: LlmEndpointSelectProps) {
  const { data: endpointsData, isLoading } = useLlmEndpoints(0, undefined, supportedFeatures);

  const options = useMemo(() => {
    if (!endpointsData) return [];
    return endpointsData.map((endpoint) => ({
      value: endpoint.id,
      label: endpoint.name,
    }));
  }, [endpointsData]);

  return <Select {...selectProps} data={options} disabled={disabled || isLoading} searchable />;
}
