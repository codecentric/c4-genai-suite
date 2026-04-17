import { Button, Portal, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { z } from 'zod';
import type { EvaluationDetailSummary } from 'src/api/generated-eval';
import { Modal } from 'src/components';
import { texts } from 'src/texts';
import { useUpdateEvaluation } from '../hooks/useEvaluationMutations';

// Module-level schema (C4 pattern)
const SCHEME = z.object({
  name: z.string().min(1, texts.evals.evaluations.nameRequired),
});

type FormValues = z.infer<typeof SCHEME>;

interface EditEvaluationNameDialogProps {
  evaluation: EvaluationDetailSummary;
  onClose: () => void;
  onUpdated?: () => void;
}

export function EditEvaluationNameDialog({ evaluation, onClose, onUpdated }: EditEvaluationNameDialogProps) {
  const updateMutation = useUpdateEvaluation();

  const form = useForm<FormValues>({
    validate: zod4Resolver(SCHEME),
    initialValues: {
      name: evaluation.name,
    },
    mode: 'controlled',
  });

  const handleSubmit = form.onSubmit((values) => {
    updateMutation.mutate(
      {
        id: evaluation.id,
        data: { name: values.name.trim(), version: evaluation.version },
      },
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
          header={texts.evals.evaluations.editNameTitle}
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
          <fieldset disabled={updateMutation.isPending}>
            <TextInput
              id="name"
              withAsterisk
              label={texts.evals.evaluations.nameLabel}
              placeholder={texts.evals.evaluations.namePlaceholder}
              className="mb-4"
              key={form.key('name')}
              {...form.getInputProps('name')}
            />
          </fieldset>
        </Modal>
      </form>
    </Portal>
  );
}
