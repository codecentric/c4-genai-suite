import { Button, Portal, Select } from '@mantine/core';
import { useForm } from '@mantine/form';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { z } from 'zod';
import type { Configuration1, Configuration2, Metric, MetricCreate, MetricUpdate } from 'src/api/generated-eval';
import { ConfirmDialog, FormAlert, Modal } from 'src/components';
import { texts } from 'src/texts';
import { GEvalMetricFields } from '../forms/GEvalMetricFields';
import { SimpleMetricFields } from '../forms/SimpleMetricFields';
import type { MetricFormValues } from '../forms/types';
import { useCreateMetric, useDeleteMetric, useUpdateMetric } from '../hooks/useMetricMutations';

// Alias for clarity
type MetricConfigurationCreate = Configuration1;
type MetricConfigurationUpdate = Configuration2;

// Module-level schema constant (C4 pattern)
const SCHEME = z
  .object({
    // Common fields
    type: z.enum(['ANSWER_RELEVANCY', 'FAITHFULNESS', 'HALLUCINATION', 'G_EVAL']),
    name: z.string().min(1, texts.evals.metric.nameRequired),
    threshold: z.number().min(0).max(1),
    chatModelId: z.string().min(1, texts.evals.metric.chatModelRequired),
    strictMode: z.boolean(),

    // Simple metric fields (optional - only validated for simple types)
    includeReason: z.boolean().optional(),

    // G-Eval fields (optional - only validated for G_EVAL type)
    evaluationSteps: z.array(z.string()).optional(),
    evaluationParams: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      // Validate G-Eval specific fields when type is G_EVAL
      if (data.type === 'G_EVAL') {
        const steps = data.evaluationSteps ?? [];
        return steps.length > 0 && steps.every((s) => s.length > 0);
      }
      return true;
    },
    {
      message: texts.evals.metric.evaluationStepsRequired,
      path: ['evaluationSteps'],
    },
  )
  .refine(
    (data) => {
      // Validate G-Eval specific fields when type is G_EVAL
      if (data.type === 'G_EVAL') {
        const params = data.evaluationParams ?? [];
        return params.length > 0;
      }
      return true;
    },
    {
      message: texts.evals.metric.evaluationParamsRequired,
      path: ['evaluationParams'],
    },
  );

type BaseMetricProps = {
  type: 'update' | 'create';
  onClose: () => void;
};

export type UpdateMetricProps = {
  type: 'update';
  target: Metric;
  onUpdate: () => void;
  onDelete: () => void;
} & BaseMetricProps;

export type CreateMetricProps = {
  type: 'create';
  onCreate: () => void;
} & BaseMetricProps;

type UpsertMetricDialogProps = UpdateMetricProps | CreateMetricProps;

// Exported wrapper components (C4 pattern)
export const UpdateMetricDialog = (props: Omit<UpdateMetricProps, 'type'>): React.ReactElement =>
  UpsertMetricDialog({ ...props, type: 'update' });
export const CreateMetricDialog = (props: Omit<CreateMetricProps, 'type'>): React.ReactElement =>
  UpsertMetricDialog({ ...props, type: 'create' });

// Metric type options for the Select dropdown
const metricTypeOptions = [
  { value: 'ANSWER_RELEVANCY', label: texts.evals.metric.typeAnswerRelevancy },
  { value: 'FAITHFULNESS', label: texts.evals.metric.typeFaithfulness },
  { value: 'HALLUCINATION', label: texts.evals.metric.typeHallucination },
  { value: 'G_EVAL', label: texts.evals.metric.typeGEval },
];

function UpsertMetricDialog(props: UpsertMetricDialogProps) {
  const isCreating = props.type === 'create';
  const { onClose } = props;

  const createMutation = useCreateMetric();
  const updateMutation = useUpdateMetric();
  const deleteMutation = useDeleteMetric();

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  // Default values based on mode
  const getDefaultValues = (): MetricFormValues => {
    if (isCreating) {
      return {
        type: 'ANSWER_RELEVANCY',
        name: '',
        threshold: 0.5,
        chatModelId: '',
        strictMode: false,
        includeReason: true,
        evaluationSteps: [''],
        evaluationParams: [],
      };
    }

    // Update mode - initialize from existing metric
    const config = props.target._configuration;
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
        evaluationParams: config.evaluationParams || [],
        includeReason: false,
      };
    }

    // Simple metrics
    return {
      ...base,
      type: config.type,
      includeReason: config.includeReason ?? true,
      evaluationSteps: [''],
      evaluationParams: [],
    };
  };

  const form = useForm<MetricFormValues>({
    validate: zod4Resolver(SCHEME) as unknown as (values: MetricFormValues) => Record<string, string | null>,
    initialValues: getDefaultValues(),
    mode: 'controlled',
  });

  const metricType = form.values.type;

  const handleSubmit = form.onSubmit((values) => {
    const { type } = values;

    // Build base configuration
    const baseConfig = {
      name: values.name,
      threshold: values.threshold,
      chatModelId: values.chatModelId,
      strictMode: values.strictMode,
    };

    // Build type-specific configuration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let configuration: any;

    if (type === 'G_EVAL') {
      configuration = {
        ...baseConfig,
        type: 'G_EVAL' as const,
        evaluationSteps: values.evaluationSteps || [],
        evaluationParams: values.evaluationParams || [],
        includeReason: false,
      };
    } else {
      // Simple metrics (ANSWER_RELEVANCY, FAITHFULNESS, HALLUCINATION)
      configuration = {
        ...baseConfig,
        type,
        includeReason: values.includeReason ?? true,
        evaluationSteps: [],
        evaluationParams: [],
      };
    }

    if (isCreating) {
      const payload: MetricCreate = {
        _configuration: configuration as MetricConfigurationCreate,
      };
      createMutation.mutate(payload, {
        onSuccess: () => {
          props.onCreate();
          onClose();
        },
      });
    } else {
      const payload: MetricUpdate = {
        version: props.target.version,
        _configuration: configuration as MetricConfigurationUpdate,
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
          header={isCreating ? texts.evals.metric.createTitle : texts.evals.metric.editTitle}
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
              common={isCreating ? texts.evals.metric.createFailed : texts.evals.metric.updateFailed}
              error={error as Error | null}
            />

            {/* Metric Type Selector */}
            <Select
              withAsterisk
              label={texts.evals.metric.selectMetricType}
              description={texts.evals.metric.selectMetricTypeHint}
              data={metricTypeOptions}
              className="mb-4"
              disabled={!isCreating}
              key={form.key('type')}
              {...form.getInputProps('type')}
            />

            {/* Conditional Fields based on type */}
            {metricType === 'G_EVAL' ? (
              <GEvalMetricFields form={form as Parameters<typeof GEvalMetricFields>[0]['form']} />
            ) : (
              <SimpleMetricFields form={form as Parameters<typeof SimpleMetricFields>[0]['form']} />
            )}

            {/* Danger Zone - only in update mode */}
            {!isCreating && (
              <>
                <hr className="my-6" />

                <div className="flex flex-row">
                  <label className="mt-3 w-48 shrink-0 text-sm font-semibold">{texts.common.dangerZone}</label>
                  <ConfirmDialog
                    title={texts.evals.metric.deleteConfirmTitle}
                    text={texts.evals.metric.deleteConfirmText(props.target._configuration.name)}
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
