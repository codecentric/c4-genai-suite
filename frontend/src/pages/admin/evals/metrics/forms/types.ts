import type { LLMTestCaseParams } from 'src/api/generated-eval';

/**
 * Combined form type that includes all possible fields across metric types.
 * Used for form field components that work with any metric type.
 * Schema is defined at module level in UpsertMetricDialog.tsx (C4 pattern).
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
