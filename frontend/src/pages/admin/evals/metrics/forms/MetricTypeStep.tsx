import { Radio, Stack } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { texts } from 'src/texts';
import type { MetricFormValues } from './types';

interface MetricTypeStepProps {
  form: UseFormReturnType<MetricFormValues>;
}

export function MetricTypeStep({ form }: MetricTypeStepProps) {
  return (
    <div className="py-4">
      <h3 className="mb-2 text-lg font-semibold">{texts.evals.metric.selectMetricType}</h3>
      <p className="mb-6 text-sm text-gray-600">{texts.evals.metric.selectMetricTypeHint}</p>

      <Radio.Group key={form.key('type')} {...form.getInputProps('type')}>
        <Stack gap="md">
          <div className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-gray-50">
            <Radio
              value="ANSWER_RELEVANCY"
              label={
                <div>
                  <div className="font-semibold">{texts.evals.metric.typeAnswerRelevancy}</div>
                  <div className="text-sm text-gray-600">{texts.evals.metric.answerRelevancyDescription}</div>
                </div>
              }
            />
          </div>

          <div className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-gray-50">
            <Radio
              value="FAITHFULNESS"
              label={
                <div>
                  <div className="font-semibold">{texts.evals.metric.typeFaithfulness}</div>
                  <div className="text-sm text-gray-600">{texts.evals.metric.faithfulnessDescription}</div>
                </div>
              }
            />
          </div>

          <div className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-gray-50">
            <Radio
              value="HALLUCINATION"
              label={
                <div>
                  <div className="font-semibold">{texts.evals.metric.typeHallucination}</div>
                  <div className="text-sm text-gray-600">{texts.evals.metric.hallucinationDescription}</div>
                </div>
              }
            />
          </div>

          <div className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-gray-50">
            <Radio
              value="G_EVAL"
              label={
                <div>
                  <div className="font-semibold">{texts.evals.metric.typeGEval}</div>
                  <div className="text-sm text-gray-600">{texts.evals.metric.gEvalDescription}</div>
                </div>
              }
            />
          </div>
        </Stack>
      </Radio.Group>
    </div>
  );
}
