import { NumberInput, PasswordInput, TextInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { texts } from 'src/texts';

const UNCHANGED_API_KEY = 'd1d04d4e-38b9-441c-a6e3-68fb1e18f0c0';

interface C4EndpointFieldsProps {
  form: UseFormReturnType<any>;
  isEdit?: boolean;
}

export function C4EndpointFields({ form, isEdit }: C4EndpointFieldsProps) {
  return (
    <>
      <TextInput
        withAsterisk
        label={texts.evals.llmEndpoint.c4EndpointLabel}
        placeholder={texts.evals.llmEndpoint.c4EndpointPlaceholder}
        className="mb-4"
        key={form.key('endpoint')}
        {...form.getInputProps('endpoint')}
      />

      <PasswordInput
        withAsterisk={!isEdit}
        label={texts.evals.llmEndpoint.apiKeyLabel}
        placeholder={isEdit ? UNCHANGED_API_KEY : texts.evals.llmEndpoint.apiKeyPlaceholder}
        description={isEdit ? texts.evals.llmEndpoint.apiKeyUnchanged : undefined}
        className="mb-4"
        key={form.key('apiKey')}
        {...form.getInputProps('apiKey')}
      />

      <NumberInput
        withAsterisk
        label={texts.evals.llmEndpoint.configurationIdLabel}
        placeholder={texts.evals.llmEndpoint.configurationIdPlaceholder}
        min={1}
        className="mb-4"
        key={form.key('configurationId')}
        {...form.getInputProps('configurationId')}
      />
    </>
  );
}

export { UNCHANGED_API_KEY };
