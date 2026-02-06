import { Button, Portal } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMemo } from 'react';
import { z } from 'zod';
import type { Metric, MetricUpdate, LLMTestCaseParams } from 'src/api/generated-eval';
import { FormAlert, Modal } from 'src/components';
import { typedZodResolver } from 'src/lib';
import { texts } from 'src/texts';
import { MetricConfigurationStep } from '../forms/MetricConfigurationStep';
import { useUpdateMetric } from '../hooks/useMetricMutations';

interface EditMetricDialogProps {
  metric: Metric;
  onClose: () => void;
  onUpdated?: () => void;
}

// Schema factory function for edit
function createUpdateValidationSchema() {
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

type UpdateFormValues = z.infer<ReturnType<typeof createUpdateValidationSchema>>;

export function EditMetricDialog({ metric, onClose, onUpdated }: EditMetricDialogProps) {
  const updateMutation = useUpdateMetric();

  // Create schema inside component to ensure texts are loaded
  const updateSchema = useMemo(() => createUpdateValidationSchema(), []);

  // Initialize form with metric data
  const getInitialValues = (): UpdateFormValues => {
    const config = metric._configuration;
    const base = {
      type: config.type,
      name: config.name,
      threshold: config.threshold,
      chatModelId: config.chatModelId,
      strictMode: config.strictMode,
    };

    if (config.type === 'G_EVAL') {
      return {
        ...base,
        type: 'G_EVAL' as const,
        evaluationSteps: config.evaluationSteps || [''],
        evaluationParams: (config.evaluationParams || []) as string[],
      };
    } else {
      // Simple metrics
      return {
        ...base,
        type: config.type as 'ANSWER_RELEVANCY' | 'FAITHFULNESS' | 'HALLUCINATION',
        includeReason: config.includeReason ?? true,
      };
    }
  };

  const form = useForm<UpdateFormValues>({
    validate: typedZodResolver(updateSchema),
    initialValues: getInitialValues(),
    mode: 'controlled',
  });

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
      const gEvalValues = values as Extract<UpdateFormValues, { type: 'G_EVAL' }>;
      configuration.evaluationSteps = gEvalValues.evaluationSteps;
      configuration.evaluationParams = gEvalValues.evaluationParams as LLMTestCaseParams[];
    } else {
      // Simple metrics (ANSWER_RELEVANCY, FAITHFULNESS, HALLUCINATION)
      const simpleValues = values as Extract<UpdateFormValues, { type: 'ANSWER_RELEVANCY' | 'FAITHFULNESS' | 'HALLUCINATION' }>;
      configuration.includeReason = simpleValues.includeReason;
    }

    const payload: MetricUpdate = {
      version: metric.version,
      _configuration: configuration,
    };

    updateMutation.mutate(
      { id: metric.id, data: payload },
      {
        onSuccess: () => {
          onUpdated?.();
          onClose();
        },
      }
    );
  });

  return (
    <Portal>
      <form noValidate onSubmit={handleSubmit}>
        <Modal
          onClose={onClose}
          header={texts.evals.metric.editTitle}
          size="lg"
          footer={
            <fieldset disabled={updateMutation.isPending}>
              <div className="flex flex-row justify-end gap-4">
                <Button type="button" variant="subtle" onClick={onClose}>
                  {texts.common.cancel}
                </Button>
                <Button type="submit" loading={updateMutation.isPending}>
                  {texts.common.save}
                </Button>
              </div>
            </fieldset>
          }
        >
          {updateMutation.isError && (
            <FormAlert type="error" className="mb-4">
              {texts.evals.metric.updateFailed}
            </FormAlert>
          )}

          <MetricConfigurationStep form={form} />
        </Modal>
      </form>
    </Portal>
  );
}
