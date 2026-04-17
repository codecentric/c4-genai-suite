import type { Language } from 'src/api/generated-eval';

/**
 * Combined form type that includes all possible fields across endpoint types.
 * Used for form field components that work with any endpoint type.
 * Schema is defined at module level in UpsertLlmEndpointDialog.tsx (C4 pattern).
 */
export interface EndpointFormValues {
  // Common fields
  type: 'OPENAI' | 'AZURE_OPENAI';
  name: string;
  parallelQueries: number;
  maxRetries: number;
  requestTimeout: number;
  apiKey?: string;

  // OpenAI-specific
  baseUrl?: string | null;
  model?: string;
  temperature?: number | null;
  language?: Language | null;

  // Azure OpenAI-specific
  endpoint?: string;
  deployment?: string;
  apiVersion?: string;
}
