import { z } from 'zod';
import { Language } from 'src/api/generated-eval';
import { texts } from 'src/texts';

// Base configuration fields common to all endpoint types
const baseConfigSchema = z.object({
  name: z.string().min(1, texts.evals.llmEndpoint.nameRequired),
  parallelQueries: z.number().int().min(1).max(100),
  maxRetries: z.number().int().min(0).max(10),
  requestTimeout: z.number().int().min(1).max(600),
});

// C4 endpoint configuration
export const c4ConfigSchema = baseConfigSchema.extend({
  type: z.literal('C4'),
  endpoint: z.string().url(texts.evals.llmEndpoint.c4EndpointRequired),
  apiKey: z.string().min(1, texts.evals.llmEndpoint.apiKeyRequired),
  configurationId: z.number().int().min(1, texts.evals.llmEndpoint.configurationIdRequired),
});

// OpenAI endpoint configuration
export const openAiConfigSchema = baseConfigSchema.extend({
  type: z.literal('OPENAI'),
  baseUrl: z.string().url().optional().nullable(),
  apiKey: z.string().min(1, texts.evals.llmEndpoint.apiKeyRequired),
  model: z.string().min(1, texts.evals.llmEndpoint.modelRequired),
  temperature: z.number().min(0).max(2).optional().nullable(),
  language: z.nativeEnum(Language).optional().nullable(),
});

// Azure OpenAI endpoint configuration
export const azureOpenAiConfigSchema = baseConfigSchema.extend({
  type: z.literal('AZURE_OPENAI'),
  endpoint: z.string().url(texts.evals.llmEndpoint.azureEndpointRequired),
  apiKey: z.string().min(1, texts.evals.llmEndpoint.apiKeyRequired),
  deployment: z.string().min(1, texts.evals.llmEndpoint.deploymentRequired),
  apiVersion: z.string().min(1, texts.evals.llmEndpoint.apiVersionRequired),
  temperature: z.number().min(0).max(2).optional().nullable(),
  language: z.nativeEnum(Language).optional().nullable(),
});

// Combined schema for create operations
export const createEndpointSchema = z.discriminatedUnion('type', [c4ConfigSchema, openAiConfigSchema, azureOpenAiConfigSchema]);

// For edit operations - apiKey is optional
export const editEndpointSchema = z.discriminatedUnion('type', [
  c4ConfigSchema.extend({ apiKey: z.string().optional() }),
  openAiConfigSchema.extend({ apiKey: z.string().optional() }),
  azureOpenAiConfigSchema.extend({ apiKey: z.string().optional() }),
]);

// Export inferred types
export type C4FormValues = z.infer<typeof c4ConfigSchema>;
export type OpenAiFormValues = z.infer<typeof openAiConfigSchema>;
export type AzureOpenAiFormValues = z.infer<typeof azureOpenAiConfigSchema>;
export type CreateEndpointFormValues = z.infer<typeof createEndpointSchema>;
export type EditEndpointFormValues = z.infer<typeof editEndpointSchema>;

// Union type for validated endpoint form values
export type CreateEndpointFormValuesUnion = CreateEndpointFormValues;
export type EditEndpointFormValuesUnion = EditEndpointFormValues;

/**
 * Combined form type that includes all possible fields across endpoint types.
 * Used for form field components that work with any endpoint type.
 * The form is initialized with all fields, but validation uses discriminated unions.
 */
export interface EndpointFormValues {
  // Common fields
  type: 'C4' | 'OPENAI' | 'AZURE_OPENAI';
  name: string;
  parallelQueries: number;
  maxRetries: number;
  requestTimeout: number;
  apiKey?: string;

  // C4-specific
  endpoint?: string;
  configurationId?: number;

  // OpenAI-specific
  baseUrl?: string | null;
  model?: string;
  temperature?: number | null;
  language?: Language | null;

  // Azure OpenAI-specific
  deployment?: string;
  apiVersion?: string;
}
