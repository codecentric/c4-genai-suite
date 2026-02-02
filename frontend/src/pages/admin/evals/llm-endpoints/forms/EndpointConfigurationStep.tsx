import type { UseFormReturnType } from '@mantine/form';
import { BaseConfigurationFields } from './BaseConfigurationFields';
import { C4EndpointFields } from './type-specific/C4EndpointFields';
import { OpenAiEndpointFields } from './type-specific/OpenAiEndpointFields';
import { AzureOpenAiEndpointFields } from './type-specific/AzureOpenAiEndpointFields';

interface EndpointConfigurationStepProps {
  form: UseFormReturnType<any>;
  endpointType: string;
  isEdit?: boolean;
}

export function EndpointConfigurationStep({ form, endpointType, isEdit }: EndpointConfigurationStepProps) {
  return (
    <div className="py-4">
      <BaseConfigurationFields form={form} isEdit={isEdit} />

      {endpointType === 'C4' && <C4EndpointFields form={form} isEdit={isEdit} />}
      {endpointType === 'OPENAI' && <OpenAiEndpointFields form={form} isEdit={isEdit} />}
      {endpointType === 'AZURE_OPENAI' && <AzureOpenAiEndpointFields form={form} isEdit={isEdit} />}
    </div>
  );
}
