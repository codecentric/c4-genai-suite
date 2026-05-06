import { NumberInput, PasswordInput, Select, TextInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { Language } from 'src/api/generated-eval';
import { texts } from 'src/texts';
import type { EndpointFormValues } from '../types';

const UNCHANGED_API_KEY = 'd1d04d4e-38b9-441c-a6e3-68fb1e18f0c0';

interface AzureOpenAiEndpointFieldsProps {
  form: UseFormReturnType<EndpointFormValues>;
  isEdit?: boolean;
}

export function AzureOpenAiEndpointFields({ form, isEdit }: AzureOpenAiEndpointFieldsProps) {
  return (
    <>
      <TextInput
        withAsterisk
        label={texts.evals.llmEndpoint.azureEndpointLabel}
        placeholder={texts.evals.llmEndpoint.azureEndpointPlaceholder}
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

      <TextInput
        withAsterisk
        label={texts.evals.llmEndpoint.deploymentLabel}
        placeholder={texts.evals.llmEndpoint.deploymentPlaceholder}
        className="mb-4"
        key={form.key('deployment')}
        {...form.getInputProps('deployment')}
      />

      <TextInput
        withAsterisk
        label={texts.evals.llmEndpoint.apiVersionLabel}
        placeholder={texts.evals.llmEndpoint.apiVersionPlaceholder}
        className="mb-4"
        key={form.key('apiVersion')}
        {...form.getInputProps('apiVersion')}
      />

      <NumberInput
        label={texts.evals.llmEndpoint.temperatureLabel}
        description={texts.evals.llmEndpoint.temperatureHint}
        min={0}
        max={2}
        step={0.1}
        decimalScale={2}
        className="mb-4"
        key={form.key('temperature')}
        {...form.getInputProps('temperature')}
      />

      <Select
        label={texts.evals.llmEndpoint.languageLabel}
        description={texts.evals.llmEndpoint.languageHint}
        data={[
          { value: Language.English, label: 'English' },
          { value: Language.German, label: 'German' },
        ]}
        className="mb-4"
        clearable
        key={form.key('language')}
        {...form.getInputProps('language')}
      />
    </>
  );
}

export { UNCHANGED_API_KEY };
