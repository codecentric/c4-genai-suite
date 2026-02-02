import { Button, Portal, Stepper } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import type { LLMEndpoint, LLMEndpointUpdate } from 'src/api/generated-eval';
import { Language } from 'src/api/generated-eval';
import { FormAlert, Modal } from 'src/components';
import { typedZodResolver } from 'src/lib';
import { texts } from 'src/texts';
import { EndpointTypeStep } from '../forms/EndpointTypeStep';
import { EndpointConfigurationStep } from '../forms/EndpointConfigurationStep';
import { useUpdateLlmEndpoint, UNCHANGED_API_KEY } from '../hooks/useLlmEndpointMutations';

interface EditLlmEndpointDialogProps {
  endpoint: LLMEndpoint;
  onClose: () => void;
  onUpdated?: () => void;
}

// Schema factory function for edit
function createUpdateValidationSchema() {
  const baseConfigSchema = z.object({
    name: z.string().min(1, texts.evals.llmEndpoint.nameRequired),
    parallelQueries: z.number().int().min(1).max(100),
    maxRetries: z.number().int().min(0).max(10),
    requestTimeout: z.number().int().min(1).max(600),
  });

  const c4ConfigSchema = baseConfigSchema.extend({
    type: z.literal('C4'),
    endpoint: z.string().url(texts.evals.llmEndpoint.c4EndpointRequired),
    apiKey: z.string().optional(),
    configurationId: z.number().int().min(1, texts.evals.llmEndpoint.configurationIdRequired),
  });

  const openAiConfigSchema = baseConfigSchema.extend({
    type: z.literal('OPENAI'),
    baseUrl: z.string().url().optional().nullable(),
    apiKey: z.string().optional(),
    model: z.string().min(1, texts.evals.llmEndpoint.modelRequired),
    temperature: z.number().min(0).max(2).optional().nullable(),
    language: z.nativeEnum(Language).optional().nullable(),
  });

  const azureOpenAiConfigSchema = baseConfigSchema.extend({
    type: z.literal('AZURE_OPENAI'),
    endpoint: z.string().url(texts.evals.llmEndpoint.azureEndpointRequired),
    apiKey: z.string().optional(),
    deployment: z.string().min(1, texts.evals.llmEndpoint.deploymentRequired),
    apiVersion: z.string().min(1, texts.evals.llmEndpoint.apiVersionRequired),
    temperature: z.number().min(0).max(2).optional().nullable(),
    language: z.nativeEnum(Language).optional().nullable(),
  });

  return z.discriminatedUnion('type', [c4ConfigSchema, openAiConfigSchema, azureOpenAiConfigSchema]);
}

type UpdateFormValues = z.infer<ReturnType<typeof createUpdateValidationSchema>>;

export function EditLlmEndpointDialog({ endpoint, onClose, onUpdated }: EditLlmEndpointDialogProps) {
  const [activeStep, setActiveStep] = useState(0);
  const updateMutation = useUpdateLlmEndpoint();

  // Create schema inside component to ensure texts are loaded
  const updateSchema = useMemo(() => createUpdateValidationSchema(), []);

  // Initialize form with endpoint data
  const getInitialValues = (): UpdateFormValues => {
    const config = endpoint._configuration;
    const base = {
      name: endpoint.name,
      parallelQueries: config.parallelQueries,
      maxRetries: config.maxRetries,
      requestTimeout: config.requestTimeout,
      type: config.type,
    };

    switch (config.type) {
      case 'C4':
        return {
          ...base,
          type: 'C4',
          endpoint: config.endpoint,
          apiKey: '', // Empty for edit, will use UNCHANGED_API_KEY if not changed
          configurationId: config.configurationId,
        } as UpdateFormValues;
      case 'OPENAI':
        return {
          ...base,
          type: 'OPENAI',
          baseUrl: config.baseUrl,
          apiKey: '', // Empty for edit
          model: config.model,
          temperature: config.temperature,
          language: config.language,
        } as UpdateFormValues;
      case 'AZURE_OPENAI':
        return {
          ...base,
          type: 'AZURE_OPENAI',
          endpoint: config.endpoint,
          apiKey: '', // Empty for edit
          deployment: config.deployment,
          apiVersion: config.apiVersion,
          temperature: config.temperature,
          language: config.language,
        } as UpdateFormValues;
      default:
        throw new Error(`Unknown endpoint type: ${(config as any).type}`);
    }
  };

  const form = useForm<UpdateFormValues>({
    validate: activeStep === 1 ? typedZodResolver(updateSchema) : undefined,
    initialValues: getInitialValues(),
    mode: 'controlled',
  });

  const handleNext = () => {
    if (activeStep === 0) {
      setActiveStep(1);
    }
  };

  const handleBack = () => {
    setActiveStep(0);
  };

  const handleSubmit = form.onSubmit((values) => {
    // Transform form values to API format
    // Extract name separately, rest goes into configuration
    const { name, type, parallelQueries, maxRetries, requestTimeout, ...typeSpecificFields } = values;

    // Build configuration based on type to ensure only relevant fields are sent
    let configuration: any = {
      type,
      parallelQueries,
      maxRetries,
      requestTimeout,
    };

    // Add type-specific fields
    if (type === 'C4') {
      configuration = {
        ...configuration,
        endpoint: typeSpecificFields.endpoint,
        apiKey: typeSpecificFields.apiKey || UNCHANGED_API_KEY,
        configurationId: typeSpecificFields.configurationId,
      };
    } else if (type === 'OPENAI') {
      configuration = {
        ...configuration,
        baseUrl: typeSpecificFields.baseUrl || null,
        apiKey: typeSpecificFields.apiKey || UNCHANGED_API_KEY,
        model: typeSpecificFields.model,
        temperature: typeSpecificFields.temperature ?? null,
        language: typeSpecificFields.language || null,
      };
    } else if (type === 'AZURE_OPENAI') {
      configuration = {
        ...configuration,
        endpoint: typeSpecificFields.endpoint,
        apiKey: typeSpecificFields.apiKey || UNCHANGED_API_KEY,
        deployment: typeSpecificFields.deployment,
        apiVersion: typeSpecificFields.apiVersion,
        temperature: typeSpecificFields.temperature ?? null,
        language: typeSpecificFields.language || null,
      };
    }

    const payload: LLMEndpointUpdate = {
      name,
      _configuration: configuration,
      version: endpoint.version,
    };

    updateMutation.mutate(
      { id: endpoint.id, data: payload },
      {
        onSuccess: () => {
          onUpdated?.();
          onClose();
        },
      },
    );
  });

  return (
    <Portal>
      <form noValidate onSubmit={handleSubmit}>
        <Modal
          onClose={onClose}
          header={texts.evals.llmEndpoint.editTitle}
          size="lg"
          footer={
            <fieldset disabled={updateMutation.isPending}>
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
                  <Button type="button" onClick={handleNext}>
                    {texts.common.confirm}
                  </Button>
                )}
                {activeStep === 1 && (
                  <Button type="submit" loading={updateMutation.isPending}>
                    {texts.common.save}
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

          <fieldset disabled={updateMutation.isPending}>
            <FormAlert common={texts.evals.llmEndpoint.updateFailed} error={updateMutation.error} />

            {activeStep === 0 && <EndpointTypeStep form={form} />}
            {activeStep === 1 && <EndpointConfigurationStep form={form} endpointType={form.values.type} isEdit={true} />}
          </fieldset>
        </Modal>
      </form>
    </Portal>
  );
}
