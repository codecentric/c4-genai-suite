import type { UseFormReturnType } from '@mantine/form';
import { BaseConfigurationFields } from './BaseConfigurationFields';
import { AzureOpenAiEndpointFields } from './type-specific/AzureOpenAiEndpointFields';
import { OpenAiEndpointFields } from './type-specific/OpenAiEndpointFields';
import type { EndpointFormValues } from './types';

interface EndpointConfigurationStepProps {
  form: UseFormReturnType<EndpointFormValues>;
  endpointType: string;
  isEdit?: boolean;
}

export function EndpointConfigurationStep({ form, endpointType, isEdit }: EndpointConfigurationStepProps) {
  return (
    <div className="py-4">
      <BaseConfigurationFields form={form} isEdit={isEdit} />

      {endpointType === 'OPENAI' && <OpenAiEndpointFields form={form} isEdit={isEdit} />}
      {endpointType === 'AZURE_OPENAI' && <AzureOpenAiEndpointFields form={form} isEdit={isEdit} />}
    </div>
  );
}
