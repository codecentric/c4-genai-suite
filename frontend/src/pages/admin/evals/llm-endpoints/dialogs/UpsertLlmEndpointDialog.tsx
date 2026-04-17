import { Button, Portal, Select } from '@mantine/core';
import { useForm } from '@mantine/form';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { z } from 'zod';
import type {
  LLMEndpoint,
  LLMEndpointConfigurationCreate,
  LLMEndpointConfigurationUpdate,
  LLMEndpointCreate,
  LLMEndpointUpdate,
} from 'src/api/generated-eval';
import { Language } from 'src/api/generated-eval';
import { ConfirmDialog, FormAlert, Modal } from 'src/components';
import { texts } from 'src/texts';
import { BaseConfigurationFields } from '../forms/BaseConfigurationFields';
import { AzureOpenAiEndpointFields } from '../forms/type-specific/AzureOpenAiEndpointFields';
import { OpenAiEndpointFields } from '../forms/type-specific/OpenAiEndpointFields';
import type { EndpointFormValues } from '../forms/types';
import {
  UNCHANGED_API_KEY,
  useCreateLlmEndpoint,
  useDeleteLlmEndpoint,
  useUpdateLlmEndpoint,
} from '../hooks/useLlmEndpointMutations';

// Module-level schema constant (C4 pattern)
const SCHEME = z
  .object({
    // Common fields
    type: z.enum(['OPENAI', 'AZURE_OPENAI']),
    name: z.string().min(1, texts.evals.llmEndpoint.nameRequired),
    parallelQueries: z.number().int().min(1).max(100),
    maxRetries: z.number().int().min(0).max(10),
    requestTimeout: z.number().int().min(1).max(600),

    // API Key - required for create, optional for update
    apiKey: z.string().optional(),

    // OpenAI-specific fields
    baseUrl: z.string().url().optional().nullable(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional().nullable(),
    language: z.nativeEnum(Language).optional().nullable(),

    // Azure OpenAI-specific fields
    endpoint: z.string().optional(),
    deployment: z.string().optional(),
    apiVersion: z.string().optional(),
  })
  .refine(
    (data) => {
      // Validate OpenAI-specific required fields
      if (data.type === 'OPENAI') {
        return data.model && data.model.length > 0;
      }
      return true;
    },
    {
      message: texts.evals.llmEndpoint.modelRequired,
      path: ['model'],
    },
  )
  .refine(
    (data) => {
      // Validate Azure OpenAI-specific required fields
      if (data.type === 'AZURE_OPENAI') {
        return data.endpoint && data.endpoint.length > 0;
      }
      return true;
    },
    {
      message: texts.evals.llmEndpoint.azureEndpointRequired,
      path: ['endpoint'],
    },
  )
  .refine(
    (data) => {
      if (data.type === 'AZURE_OPENAI') {
        return data.deployment && data.deployment.length > 0;
      }
      return true;
    },
    {
      message: texts.evals.llmEndpoint.deploymentRequired,
      path: ['deployment'],
    },
  )
  .refine(
    (data) => {
      if (data.type === 'AZURE_OPENAI') {
        return data.apiVersion && data.apiVersion.length > 0;
      }
      return true;
    },
    {
      message: texts.evals.llmEndpoint.apiVersionRequired,
      path: ['apiVersion'],
    },
  );

type BaseLlmEndpointProps = {
  type: 'update' | 'create';
  onClose: () => void;
};

export type UpdateLlmEndpointProps = {
  type: 'update';
  target: LLMEndpoint;
  onUpdate: () => void;
  onDelete: () => void;
} & BaseLlmEndpointProps;

export type CreateLlmEndpointProps = {
  type: 'create';
  onCreate: () => void;
} & BaseLlmEndpointProps;

type UpsertLlmEndpointDialogProps = UpdateLlmEndpointProps | CreateLlmEndpointProps;

// Exported wrapper components (C4 pattern)
export const UpdateLlmEndpointDialog = (props: Omit<UpdateLlmEndpointProps, 'type'>): React.ReactElement =>
  UpsertLlmEndpointDialog({ ...props, type: 'update' });
export const CreateLlmEndpointDialog = (props: Omit<CreateLlmEndpointProps, 'type'>): React.ReactElement =>
  UpsertLlmEndpointDialog({ ...props, type: 'create' });

// Endpoint type options for the Select dropdown
const endpointTypeOptions = [
  { value: 'AZURE_OPENAI', label: texts.evals.llmEndpoint.typeAzureOpenAI },
  { value: 'OPENAI', label: texts.evals.llmEndpoint.typeOpenAI },
];

function UpsertLlmEndpointDialog(props: UpsertLlmEndpointDialogProps) {
  const isCreating = props.type === 'create';
  const { onClose } = props;

  const createMutation = useCreateLlmEndpoint();
  const updateMutation = useUpdateLlmEndpoint();
  const deleteMutation = useDeleteLlmEndpoint();

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  // Default values based on mode
  const getDefaultValues = (): EndpointFormValues => {
    if (isCreating) {
      return {
        type: 'AZURE_OPENAI',
        name: '',
        parallelQueries: 5,
        maxRetries: 3,
        requestTimeout: 60,
        apiKey: '',
        // Azure OpenAI defaults
        endpoint: '',
        deployment: '',
        apiVersion: '2024-02-15-preview',
        temperature: 0,
        language: Language.English,
        // OpenAI defaults
        baseUrl: '',
        model: '',
      };
    }

    // Update mode - initialize from existing endpoint
    const config = props.target._configuration;
    const base = {
      type: config.type as 'OPENAI' | 'AZURE_OPENAI',
      name: props.target.name,
      parallelQueries: config.parallelQueries,
      maxRetries: config.maxRetries,
      requestTimeout: config.requestTimeout,
      apiKey: '', // Empty for edit
    };

    if (config.type === 'OPENAI') {
      return {
        ...base,
        type: 'OPENAI',
        baseUrl: config.baseUrl,
        model: config.model,
        temperature: config.temperature,
        language: config.language,
        // Azure defaults (unused)
        endpoint: '',
        deployment: '',
        apiVersion: '',
      };
    }

    // AZURE_OPENAI
    return {
      ...base,
      type: 'AZURE_OPENAI',
      endpoint: config.endpoint,
      deployment: config.deployment,
      apiVersion: config.apiVersion,
      temperature: config.temperature,
      language: config.language,
      // OpenAI defaults (unused)
      baseUrl: '',
      model: '',
    };
  };

  const form = useForm<EndpointFormValues>({
    validate: zod4Resolver(SCHEME) as unknown as (values: EndpointFormValues) => Record<string, string | null>,
    initialValues: getDefaultValues(),
    mode: 'controlled',
  });

  const endpointType = form.values.type;
  const isEdit = !isCreating;

  const handleSubmit = form.onSubmit((values) => {
    const { type, name, parallelQueries, maxRetries, requestTimeout } = values;

    // Build base configuration
    const baseConfig = {
      parallelQueries,
      maxRetries,
      requestTimeout,
    };

    // Build type-specific configuration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let configuration: any;

    if (type === 'OPENAI') {
      configuration = {
        ...baseConfig,
        type: 'OPENAI' as const,
        baseUrl: values.baseUrl || '',
        apiKey: isCreating ? values.apiKey : values.apiKey || UNCHANGED_API_KEY,
        model: values.model || '',
        temperature: values.temperature ?? 0,
        language: values.language || Language.English,
      };
    } else {
      // AZURE_OPENAI
      configuration = {
        ...baseConfig,
        type: 'AZURE_OPENAI' as const,
        endpoint: values.endpoint || '',
        apiKey: isCreating ? values.apiKey : values.apiKey || UNCHANGED_API_KEY,
        deployment: values.deployment || '',
        apiVersion: values.apiVersion || '',
        temperature: values.temperature ?? 0,
        language: values.language || Language.English,
      };
    }

    if (isCreating) {
      const payload: LLMEndpointCreate = {
        name,
        _configuration: configuration as LLMEndpointConfigurationCreate,
      };
      createMutation.mutate(payload, {
        onSuccess: () => {
          props.onCreate();
          onClose();
        },
      });
    } else {
      const payload: LLMEndpointUpdate = {
        name,
        version: props.target.version,
        _configuration: configuration as LLMEndpointConfigurationUpdate,
      };
      updateMutation.mutate(
        { id: props.target.id, data: payload },
        {
          onSuccess: () => {
            props.onUpdate();
            onClose();
          },
        },
      );
    }
  });

  const handleDelete = () => {
    if (!isCreating) {
      deleteMutation.mutate(
        { id: props.target.id, data: { version: props.target.version } },
        {
          onSuccess: () => {
            props.onDelete();
            onClose();
          },
        },
      );
    }
  };

  return (
    <Portal>
      <form noValidate onSubmit={handleSubmit}>
        <Modal
          onClose={onClose}
          header={isCreating ? texts.evals.llmEndpoint.createTitle : texts.evals.llmEndpoint.editTitle}
          size="lg"
          footer={
            <fieldset disabled={isPending}>
              <div className="flex flex-row justify-end gap-4">
                <Button type="button" variant="subtle" onClick={onClose}>
                  {texts.common.cancel}
                </Button>
                <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                  {texts.common.save}
                </Button>
              </div>
            </fieldset>
          }
        >
          <fieldset disabled={isPending}>
            <FormAlert
              common={isCreating ? texts.evals.llmEndpoint.createFailed : texts.evals.llmEndpoint.updateFailed}
              error={error as Error | null}
            />

            {/* Endpoint Type Selector */}
            <Select
              withAsterisk
              label={texts.evals.llmEndpoint.selectEndpointType}
              description={texts.evals.llmEndpoint.selectEndpointTypeHint}
              data={endpointTypeOptions}
              className="mb-4"
              disabled={!isCreating}
              key={form.key('type')}
              {...form.getInputProps('type')}
            />

            {/* Base Configuration Fields */}
            <BaseConfigurationFields form={form as Parameters<typeof BaseConfigurationFields>[0]['form']} isEdit={isEdit} />

            {/* Type-specific Fields */}
            {endpointType === 'OPENAI' && (
              <OpenAiEndpointFields form={form as Parameters<typeof OpenAiEndpointFields>[0]['form']} isEdit={isEdit} />
            )}
            {endpointType === 'AZURE_OPENAI' && (
              <AzureOpenAiEndpointFields form={form as Parameters<typeof AzureOpenAiEndpointFields>[0]['form']} isEdit={isEdit} />
            )}

            {/* Danger Zone - only in update mode */}
            {!isCreating && (
              <>
                <hr className="my-6" />

                <div className="flex flex-row">
                  <label className="mt-3 w-48 shrink-0 text-sm font-semibold">{texts.common.dangerZone}</label>
                  <ConfirmDialog
                    title={texts.evals.llmEndpoint.deleteConfirmTitle}
                    text={texts.evals.llmEndpoint.deleteConfirmText(props.target.name)}
                    onPerform={handleDelete}
                  >
                    {({ onClick }) => (
                      <button type="button" className="btn btn-error" onClick={onClick}>
                        {texts.common.remove}
                      </button>
                    )}
                  </ConfirmDialog>
                </div>
              </>
            )}
          </fieldset>
        </Modal>
      </form>
    </Portal>
  );
}
