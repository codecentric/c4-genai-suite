import { NumberInput, PasswordInput, Select, TextInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { Language } from 'src/api/generated-eval';
import { texts } from 'src/texts';

const UNCHANGED_API_KEY = 'd1d04d4e-38b9-441c-a6e3-68fb1e18f0c0';

interface OpenAiEndpointFieldsProps {
  form: UseFormReturnType<any>;
  isEdit?: boolean;
}

export function OpenAiEndpointFields({ form, isEdit }: OpenAiEndpointFieldsProps) {
  return (
    <>
      <TextInput
        label={texts.evals.llmEndpoint.baseUrlLabel}
        placeholder={texts.evals.llmEndpoint.baseUrlPlaceholder}
        description={texts.evals.llmEndpoint.baseUrlHint}
        className="mb-4"
        key={form.key('baseUrl')}
        {...form.getInputProps('baseUrl')}
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
        label={texts.evals.llmEndpoint.modelLabel}
        placeholder={texts.evals.llmEndpoint.modelPlaceholder}
        className="mb-4"
        key={form.key('model')}
        {...form.getInputProps('model')}
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
