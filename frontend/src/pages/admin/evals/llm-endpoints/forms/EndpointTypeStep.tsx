import { Radio, Stack } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { texts } from 'src/texts';
import type { EndpointFormValues } from './types';

interface EndpointTypeStepProps {
  form: UseFormReturnType<EndpointFormValues>;
}

export function EndpointTypeStep({ form }: EndpointTypeStepProps) {
  return (
    <div className="py-4">
      <h3 className="mb-2 text-lg font-semibold">{texts.evals.llmEndpoint.selectEndpointType}</h3>
      <p className="mb-6 text-sm text-gray-600">{texts.evals.llmEndpoint.selectEndpointTypeHint}</p>

      <Radio.Group key={form.key('type')} {...form.getInputProps('type')}>
        <Stack gap="md">
          <div className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-gray-50">
            <Radio
              value="C4"
              label={
                <div>
                  <div className="font-semibold">{texts.evals.llmEndpoint.typeC4}</div>
                  <div className="text-sm text-gray-600">{texts.evals.llmEndpoint.c4Description}</div>
                </div>
              }
            />
          </div>

          <div className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-gray-50">
            <Radio
              value="OPENAI"
              label={
                <div>
                  <div className="font-semibold">{texts.evals.llmEndpoint.typeOpenAI}</div>
                  <div className="text-sm text-gray-600">{texts.evals.llmEndpoint.openAiDescription}</div>
                </div>
              }
            />
          </div>

          <div className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-gray-50">
            <Radio
              value="AZURE_OPENAI"
              label={
                <div>
                  <div className="font-semibold">{texts.evals.llmEndpoint.typeAzureOpenAI}</div>
                  <div className="text-sm text-gray-600">{texts.evals.llmEndpoint.azureOpenAiDescription}</div>
                </div>
              }
            />
          </div>
        </Stack>
      </Radio.Group>
    </div>
  );
}
