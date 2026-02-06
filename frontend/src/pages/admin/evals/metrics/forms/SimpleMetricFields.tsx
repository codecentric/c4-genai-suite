import { Switch } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { texts } from 'src/texts';
import { BaseMetricFields } from './BaseMetricFields';

interface SimpleMetricFieldsProps {
  form: UseFormReturnType<any>;
}

export function SimpleMetricFields({ form }: SimpleMetricFieldsProps) {
  return (
    <>
      <BaseMetricFields form={form} />

      <Switch
        label={texts.evals.metric.includeReasonLabel}
        description={texts.evals.metric.includeReasonHint}
        className="mb-4"
        key={form.key('includeReason')}
        {...form.getInputProps('includeReason', { type: 'checkbox' })}
      />
    </>
  );
}
