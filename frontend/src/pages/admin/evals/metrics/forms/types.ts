import { z } from 'zod';
import type { LLMTestCaseParams } from 'src/api/generated-eval';
import { texts } from 'src/texts';

// Base fields common to all metrics
const baseSchema = z.object({
  name: z.string().min(1, texts.evals.metric.nameRequired),
  threshold: z.number().min(0).max(1),
  chatModelId: z.string().min(1, texts.evals.metric.chatModelRequired),
  strictMode: z.boolean(),
});

// Simple metrics schema (Answer Relevancy, Faithfulness, Hallucination)
export const simpleMetricSchema = baseSchema.extend({
  type: z.enum(['ANSWER_RELEVANCY', 'FAITHFULNESS', 'HALLUCINATION']),
  includeReason: z.boolean(),
});

// G-Eval schema
export const gEvalMetricSchema = baseSchema.extend({
  type: z.literal('G_EVAL'),
  evaluationSteps: z.array(z.string().min(1)).min(1, texts.evals.metric.evaluationStepsRequired),
  evaluationParams: z.array(z.string()).min(1, texts.evals.metric.evaluationParamsRequired),
});

// Combined schema
export const createMetricSchema = z.discriminatedUnion('type', [simpleMetricSchema, gEvalMetricSchema]);

// Export inferred types
export type SimpleMetricFormValues = z.infer<typeof simpleMetricSchema>;
export type GEvalMetricFormValues = z.infer<typeof gEvalMetricSchema>;
export type CreateMetricFormValues = z.infer<typeof createMetricSchema>;

/**
 * Combined form type that includes all possible fields across metric types.
 * Used for form field components that work with any metric type.
 */
export interface MetricFormValues {
  // Common fields
  type: 'ANSWER_RELEVANCY' | 'FAITHFULNESS' | 'HALLUCINATION' | 'G_EVAL';
  name: string;
  threshold: number;
  chatModelId: string;
  strictMode: boolean;

  // Simple metric-specific
  includeReason?: boolean;

  // G-Eval-specific
  evaluationSteps?: string[];
  evaluationParams?: LLMTestCaseParams[];
}
