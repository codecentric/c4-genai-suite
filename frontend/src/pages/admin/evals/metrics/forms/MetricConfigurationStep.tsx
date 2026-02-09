import type { UseFormReturnType } from '@mantine/form';
import { GEvalMetricFields } from './GEvalMetricFields';
import { SimpleMetricFields } from './SimpleMetricFields';
import type { MetricFormValues } from './types';

interface MetricConfigurationStepProps {
  form: UseFormReturnType<MetricFormValues>;
}

export function MetricConfigurationStep({ form }: MetricConfigurationStepProps) {
  const metricType: MetricFormValues['type'] = form.values.type;

  // Router component: render appropriate form based on selected metric type
  if (metricType === 'G_EVAL') {
    return <GEvalMetricFields form={form} />;
  }

  // For ANSWER_RELEVANCY, FAITHFULNESS, and HALLUCINATION
  if (metricType === 'ANSWER_RELEVANCY' || metricType === 'FAITHFULNESS' || metricType === 'HALLUCINATION') {
    return <SimpleMetricFields form={form} />;
  }

  // Fallback (shouldn't happen if wizard enforces type selection)
  return (
    <div className="py-8 text-center text-gray-500">
      <p>Please select a metric type first</p>
    </div>
  );
}
