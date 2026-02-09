import { Slider, Switch, TextInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { LlmEndpointSelect } from 'src/pages/admin/evals/components/LlmEndpointSelect';
import { texts } from 'src/texts';
import type { MetricFormValues } from './types';

interface BaseMetricFieldsProps {
  form: UseFormReturnType<MetricFormValues>;
}

export function BaseMetricFields({ form }: BaseMetricFieldsProps) {
  // Threshold marks for the slider
  const thresholdMarks = [
    { value: 0, label: '0' },
    { value: 0.25, label: '0.25' },
    { value: 0.5, label: '0.5' },
    { value: 0.75, label: '0.75' },
    { value: 1, label: '1' },
  ];

  return (
    <>
      <TextInput
        withAsterisk
        label={texts.evals.metric.nameLabel}
        placeholder={texts.evals.metric.namePlaceholder}
        className="mb-4"
        key={form.key('name')}
        {...form.getInputProps('name')}
      />

      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium">
          {texts.evals.metric.thresholdLabel}
          <span className="ml-1 text-red-500">*</span>
        </label>
        <p className="mb-3 text-sm text-gray-600">{texts.evals.metric.thresholdHint}</p>
        <Slider
          min={0}
          max={1}
          step={0.05}
          marks={thresholdMarks}
          label={(value) => value.toFixed(2)}
          className="mb-2"
          key={form.key('threshold')}
          {...form.getInputProps('threshold')}
        />
      </div>

      <LlmEndpointSelect
        withAsterisk
        label={texts.evals.metric.chatModelLabel}
        placeholder={texts.evals.metric.chatModelPlaceholder}
        description={texts.evals.metric.chatModelHint}
        supportedFeatures={['CHAT_MODEL']}
        className="mb-4"
        key={form.key('chatModelId')}
        {...form.getInputProps('chatModelId')}
      />

      <Switch
        label={texts.evals.metric.strictModeLabel}
        description={texts.evals.metric.strictModeHint}
        className="mb-4"
        key={form.key('strictMode')}
        {...form.getInputProps('strictMode', { type: 'checkbox' })}
      />
    </>
  );
}
