import { ActionIcon, Button, MultiSelect, TextInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { LLMTestCaseParams } from 'src/api/generated-eval';
import { texts } from 'src/texts';
import { BaseMetricFields } from './BaseMetricFields';
import type { MetricFormValues } from './types';

interface GEvalMetricFieldsProps {
  form: UseFormReturnType<MetricFormValues>;
}

export function GEvalMetricFields({ form }: GEvalMetricFieldsProps) {
  // Options for evaluation parameters (LLMTestCaseParams)
  const evaluationParamsOptions = [
    { value: LLMTestCaseParams.Input, label: texts.evals.metric.paramInput },
    { value: LLMTestCaseParams.ActualOutput, label: texts.evals.metric.paramActualOutput },
    { value: LLMTestCaseParams.ExpectedOutput, label: texts.evals.metric.paramExpectedOutput },
    { value: LLMTestCaseParams.Context, label: texts.evals.metric.paramContext },
    { value: LLMTestCaseParams.RetrievalContext, label: texts.evals.metric.paramRetrievalContext },
    { value: LLMTestCaseParams.ToolsCalled, label: texts.evals.metric.paramToolsCalled },
    { value: LLMTestCaseParams.ExpectedTools, label: texts.evals.metric.paramExpectedTools },
  ];

  return (
    <>
      <BaseMetricFields form={form} />

      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium">
          {texts.evals.metric.evaluationStepsLabel}
          <span className="ml-1 text-red-500">*</span>
        </label>
        <p className="mb-3 text-sm text-gray-600">{texts.evals.metric.evaluationStepsHint}</p>

        {form.values.evaluationSteps?.map((_, index) => (
          <div key={index} className="mb-2 flex gap-2">
            <TextInput
              className="flex-1"
              placeholder={texts.evals.metric.evaluationStepPlaceholder}
              key={form.key(`evaluationSteps.${index}`)}
              {...form.getInputProps(`evaluationSteps.${index}`)}
            />
            <ActionIcon
              color="red"
              variant="light"
              onClick={() => form.removeListItem('evaluationSteps', index)}
              disabled={(form.values.evaluationSteps?.length ?? 0) <= 1}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </div>
        ))}

        <Button
          variant="light"
          leftSection={<IconPlus size={16} />}
          onClick={() => form.insertListItem('evaluationSteps', '')}
          className="mt-2"
        >
          {texts.evals.metric.addEvaluationStep}
        </Button>

        {form.errors.evaluationSteps && <p className="mt-1 text-sm text-red-500">{form.errors.evaluationSteps}</p>}
      </div>

      <MultiSelect
        withAsterisk
        label={texts.evals.metric.evaluationParamsLabel}
        description={texts.evals.metric.evaluationParamsHint}
        data={evaluationParamsOptions}
        className="mb-4"
        key={form.key('evaluationParams')}
        {...form.getInputProps('evaluationParams')}
      />
    </>
  );
}
