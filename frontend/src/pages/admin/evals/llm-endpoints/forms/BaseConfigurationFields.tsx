import { NumberInput, TextInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { texts } from 'src/texts';

interface BaseConfigurationFieldsProps {
  form: UseFormReturnType<any>;
  isEdit?: boolean;
}

export function BaseConfigurationFields({ form, isEdit: _isEdit }: BaseConfigurationFieldsProps) {
  return (
    <>
      <TextInput
        withAsterisk
        label={texts.evals.llmEndpoint.nameLabel}
        placeholder={texts.evals.llmEndpoint.namePlaceholder}
        className="mb-4"
        key={form.key('name')}
        {...form.getInputProps('name')}
      />

      <NumberInput
        withAsterisk
        label={texts.evals.llmEndpoint.parallelQueriesLabel}
        description={texts.evals.llmEndpoint.parallelQueriesHint}
        min={1}
        max={100}
        className="mb-4"
        key={form.key('parallelQueries')}
        {...form.getInputProps('parallelQueries')}
      />

      <NumberInput
        withAsterisk
        label={texts.evals.llmEndpoint.maxRetriesLabel}
        description={texts.evals.llmEndpoint.maxRetriesHint}
        min={0}
        max={10}
        className="mb-4"
        key={form.key('maxRetries')}
        {...form.getInputProps('maxRetries')}
      />

      <NumberInput
        withAsterisk
        label={texts.evals.llmEndpoint.requestTimeoutLabel}
        description={texts.evals.llmEndpoint.requestTimeoutHint}
        min={1}
        max={600}
        className="mb-4"
        key={form.key('requestTimeout')}
        {...form.getInputProps('requestTimeout')}
      />
    </>
  );
}
