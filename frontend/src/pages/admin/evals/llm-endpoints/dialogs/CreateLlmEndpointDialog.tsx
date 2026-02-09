import { Button, Portal, Stepper } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import type { LLMEndpointConfigurationCreate, LLMEndpointCreate } from 'src/api/generated-eval';
import { Language } from 'src/api/generated-eval';
import { FormAlert, Modal } from 'src/components';
import { typedZodResolver } from 'src/lib';
import { texts } from 'src/texts';
import { EndpointConfigurationStep } from '../forms/EndpointConfigurationStep';
import { EndpointTypeStep } from '../forms/EndpointTypeStep';
import { useCreateLlmEndpoint } from '../hooks/useLlmEndpointMutations';

interface CreateLlmEndpointDialogProps {
  onClose: () => void;
  onCreated?: () => void;
}

// Schema factory function
function createValidationSchema() {
  const baseConfigSchema = z.object({
    name: z.string().min(1, texts.evals.llmEndpoint.nameRequired),
    parallelQueries: z.number().int().min(1).max(100),
    maxRetries: z.number().int().min(0).max(10),
    requestTimeout: z.number().int().min(1).max(600),
  });

  const c4ConfigSchema = baseConfigSchema.extend({
    type: z.literal('C4'),
    endpoint: z.string().url(texts.evals.llmEndpoint.c4EndpointRequired),
    apiKey: z.string().min(1, texts.evals.llmEndpoint.apiKeyRequired),
    configurationId: z.number().int().min(1, texts.evals.llmEndpoint.configurationIdRequired),
  });

  const openAiConfigSchema = baseConfigSchema.extend({
    type: z.literal('OPENAI'),
    baseUrl: z.string().url().optional().nullable(),
    apiKey: z.string().min(1, texts.evals.llmEndpoint.apiKeyRequired),
    model: z.string().min(1, texts.evals.llmEndpoint.modelRequired),
    temperature: z.number().min(0).max(2).optional().nullable(),
    language: z.nativeEnum(Language).optional().nullable(),
  });

  const azureOpenAiConfigSchema = baseConfigSchema.extend({
    type: z.literal('AZURE_OPENAI'),
    endpoint: z.string().url(texts.evals.llmEndpoint.azureEndpointRequired),
    apiKey: z.string().min(1, texts.evals.llmEndpoint.apiKeyRequired),
    deployment: z.string().min(1, texts.evals.llmEndpoint.deploymentRequired),
    apiVersion: z.string().min(1, texts.evals.llmEndpoint.apiVersionRequired),
    temperature: z.number().min(0).max(2).optional().nullable(),
    language: z.nativeEnum(Language).optional().nullable(),
  });

  return z.discriminatedUnion('type', [c4ConfigSchema, openAiConfigSchema, azureOpenAiConfigSchema]);
}

type CreateFormValues = z.infer<ReturnType<typeof createValidationSchema>>;

export function CreateLlmEndpointDialog({ onClose, onCreated }: CreateLlmEndpointDialogProps) {
  const [activeStep, setActiveStep] = useState(0);
  const createMutation = useCreateLlmEndpoint();

  // Create schema inside component to ensure texts are loaded
  const createSchema = useMemo(() => createValidationSchema(), []);

  const form = useForm<CreateFormValues>({
    validate: activeStep === 1 ? typedZodResolver(createSchema) : undefined,
    initialValues: {
      type: 'C4',
      name: '',
      parallelQueries: 5,
      maxRetries: 3,
      requestTimeout: 60,
      // C4 defaults
      endpoint: '',
      apiKey: '',
      configurationId: 1,
    } as CreateFormValues,
    mode: 'controlled',
  });

  const handleNext = () => {
    if (activeStep === 0) {
      // Just move to next step for type selection
      setActiveStep(1);
    }
  };

  const handleBack = () => {
    setActiveStep(0);
  };

  const handleSubmit = form.onSubmit((values) => {
    // Transform form values to API format
    // Extract name separately, rest goes into configuration
    const { name, type, parallelQueries, maxRetries, requestTimeout } = values;

    // Base configuration fields common to all types
    const baseConfig = {
      type,
      parallelQueries,
      maxRetries,
      requestTimeout,
    };

    // Build configuration based on type - cast to Partial first, then to full type
    // This is needed because the generated API type requires all fields, but the backend
    // only uses fields relevant to each type
    let configuration: Partial<LLMEndpointConfigurationCreate>;

    if (type === 'C4') {
      const c4Values = values as CreateFormValues & { type: 'C4' };
      configuration = {
        ...baseConfig,
        endpoint: c4Values.endpoint,
        apiKey: c4Values.apiKey,
        configurationId: c4Values.configurationId,
      };
    } else if (type === 'OPENAI') {
      const openAiValues = values as CreateFormValues & { type: 'OPENAI' };
      configuration = {
        ...baseConfig,
        baseUrl: openAiValues.baseUrl || '',
        apiKey: openAiValues.apiKey,
        model: openAiValues.model,
        temperature: openAiValues.temperature ?? 0,
        language: openAiValues.language || Language.English,
      };
    } else {
      // AZURE_OPENAI
      const azureValues = values as CreateFormValues & { type: 'AZURE_OPENAI' };
      configuration = {
        ...baseConfig,
        endpoint: azureValues.endpoint,
        apiKey: azureValues.apiKey,
        deployment: azureValues.deployment,
        apiVersion: azureValues.apiVersion,
        temperature: azureValues.temperature ?? 0,
        language: azureValues.language || Language.English,
      };
    }

    const payload: LLMEndpointCreate = {
      name,
      _configuration: configuration as LLMEndpointConfigurationCreate,
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        onCreated?.();
        onClose();
      },
    });
  });

  return (
    <Portal>
      <form noValidate onSubmit={handleSubmit}>
        <Modal
          onClose={onClose}
          header={texts.evals.llmEndpoint.createTitle}
          size="lg"
          footer={
            <fieldset disabled={createMutation.isPending}>
              <div className="flex flex-row justify-end gap-4">
                {activeStep === 1 && (
                  <Button type="button" variant="subtle" onClick={handleBack}>
                    {texts.common.cancel}
                  </Button>
                )}
                {activeStep === 0 && (
                  <Button type="button" variant="subtle" onClick={onClose}>
                    {texts.common.cancel}
                  </Button>
                )}
                {activeStep === 0 && (
                  <Button type="button" onClick={handleNext} disabled={!form.values.type}>
                    {texts.common.confirm}
                  </Button>
                )}
                {activeStep === 1 && (
                  <Button type="submit" loading={createMutation.isPending}>
                    {texts.evals.llmEndpoint.create}
                  </Button>
                )}
              </div>
            </fieldset>
          }
        >
          <Stepper active={activeStep} className="mb-4">
            <Stepper.Step label={texts.evals.llmEndpoint.stepSelectType} />
            <Stepper.Step label={texts.evals.llmEndpoint.stepConfigure} />
          </Stepper>

          <fieldset disabled={createMutation.isPending}>
            <FormAlert common={texts.evals.llmEndpoint.createFailed} error={createMutation.error as Error | null} />

            {/* Form type is discriminated union but child components accept flat type - structurally compatible */}
            {activeStep === 0 && <EndpointTypeStep form={form as unknown as Parameters<typeof EndpointTypeStep>[0]['form']} />}
            {activeStep === 1 && (
              <EndpointConfigurationStep
                form={form as unknown as Parameters<typeof EndpointConfigurationStep>[0]['form']}
                endpointType={form.values.type}
                isEdit={false}
              />
            )}
          </fieldset>
        </Modal>
      </form>
    </Portal>
  );
}
