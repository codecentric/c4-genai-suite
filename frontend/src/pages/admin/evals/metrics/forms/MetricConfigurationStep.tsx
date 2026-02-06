import type { UseFormReturnType } from '@mantine/form';
import { GEvalMetricFields } from './GEvalMetricFields';
import { SimpleMetricFields } from './SimpleMetricFields';

interface MetricConfigurationStepProps {
  form: UseFormReturnType<any>;
}

export function MetricConfigurationStep({ form }: MetricConfigurationStepProps) {
  const metricType = form.values.type;

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
    <div className="text-center text-gray-500 py-8">
      <p>Please select a metric type first</p>
    </div>
  );
}
