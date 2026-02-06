import { Button, Portal, Stepper } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import type { MetricCreate, LLMTestCaseParams } from 'src/api/generated-eval';
import { FormAlert, Modal } from 'src/components';
import { typedZodResolver } from 'src/lib';
import { texts } from 'src/texts';
import { MetricTypeStep } from '../forms/MetricTypeStep';
import { MetricConfigurationStep } from '../forms/MetricConfigurationStep';
import { useCreateMetric } from '../hooks/useMetricMutations';

interface CreateMetricDialogProps {
  onClose: () => void;
  onCreated?: () => void;
}

// Schema factory function
function createValidationSchema() {
  // Base fields common to all metrics
  const baseSchema = z.object({
    name: z.string().min(1, texts.evals.metric.nameRequired),
    threshold: z.number().min(0).max(1),
    chatModelId: z.string().min(1, texts.evals.metric.chatModelRequired),
    strictMode: z.boolean(),
  });

  // Simple metrics schema (Answer Relevancy, Faithfulness, Hallucination)
  const simpleMetricSchema = baseSchema.extend({
    type: z.enum(['ANSWER_RELEVANCY', 'FAITHFULNESS', 'HALLUCINATION']),
    includeReason: z.boolean(),
  });

  // G-Eval schema
  const gEvalMetricSchema = baseSchema.extend({
    type: z.literal('G_EVAL'),
    evaluationSteps: z
      .array(z.string().min(1))
      .min(1, texts.evals.metric.evaluationStepsRequired),
    evaluationParams: z
      .array(z.string())
      .min(1, texts.evals.metric.evaluationParamsRequired),
  });

  return z.discriminatedUnion('type', [simpleMetricSchema, gEvalMetricSchema]);
}

type CreateFormValues = z.infer<ReturnType<typeof createValidationSchema>>;

export function CreateMetricDialog({ onClose, onCreated }: CreateMetricDialogProps) {
  const [activeStep, setActiveStep] = useState(0);
  const createMutation = useCreateMetric();

  // Create schema inside component to ensure texts are loaded
  const createSchema = useMemo(() => createValidationSchema(), []);

  const form = useForm<CreateFormValues>({
    validate: activeStep === 1 ? typedZodResolver(createSchema) : undefined,
    initialValues: {
      type: 'ANSWER_RELEVANCY',
      name: '',
      threshold: 0.5,
      chatModelId: '',
      strictMode: false,
      includeReason: true,
      // G-Eval defaults (will be ignored for simple metrics)
      evaluationSteps: [''],
      evaluationParams: [],
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
    // NOTE: API expects ALL fields to be present, even if not used for the metric type
    const { type } = values;

    let configuration: any = {
      type,
      name: values.name,
      threshold: values.threshold,
      chatModelId: values.chatModelId,
      strictMode: values.strictMode,
      // Provide defaults for all fields
      evaluationSteps: [],
      evaluationParams: [],
      includeReason: false,
    };

    // Override with type-specific values
    if (type === 'G_EVAL') {
      const gEvalValues = values as Extract<CreateFormValues, { type: 'G_EVAL' }>;
      configuration.evaluationSteps = gEvalValues.evaluationSteps;
      configuration.evaluationParams = gEvalValues.evaluationParams as LLMTestCaseParams[];
    } else {
      // Simple metrics (ANSWER_RELEVANCY, FAITHFULNESS, HALLUCINATION)
      const simpleValues = values as Extract<CreateFormValues, { type: 'ANSWER_RELEVANCY' | 'FAITHFULNESS' | 'HALLUCINATION' }>;
      configuration.includeReason = simpleValues.includeReason;
    }

    const payload: MetricCreate = {
      _configuration: configuration,
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
          header={texts.evals.metric.createTitle}
          size="lg"
          footer={
            <fieldset disabled={createMutation.isPending}>
              <div className="flex flex-row justify-end gap-4">
                {activeStep === 1 && (
                  <Button type="button" variant="subtle" onClick={handleBack}>
                    {texts.common.back}
                  </Button>
                )}
                {activeStep === 0 && (
                  <Button type="button" variant="subtle" onClick={onClose}>
                    {texts.common.cancel}
                  </Button>
                )}
                {activeStep === 0 && (
                  <Button type="button" onClick={handleNext} disabled={!form.values.type}>
                    {texts.common.next}
                  </Button>
                )}
                {activeStep === 1 && (
                  <Button type="submit" loading={createMutation.isPending}>
                    {texts.evals.metric.create}
                  </Button>
                )}
              </div>
            </fieldset>
          }
        >
          <Stepper active={activeStep} className="mb-4">
            <Stepper.Step label={texts.evals.metric.stepSelectType} />
            <Stepper.Step label={texts.evals.metric.stepConfigure} />
          </Stepper>

          {createMutation.isError && (
            <FormAlert type="error" className="mb-4">
              {texts.evals.metric.createFailed}
            </FormAlert>
          )}

          {activeStep === 0 && <MetricTypeStep form={form} />}
          {activeStep === 1 && <MetricConfigurationStep form={form} />}
        </Modal>
      </form>
    </Portal>
  );
}
