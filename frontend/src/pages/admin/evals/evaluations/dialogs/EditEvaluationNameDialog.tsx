import { Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect } from 'react';
import type { EvaluationDetailSummary } from 'src/api/generated-eval';
import { texts } from 'src/texts';
import { useUpdateEvaluation } from '../hooks/useEvaluationMutations';

interface EditEvaluationNameDialogProps {
  evaluation: EvaluationDetailSummary | null;
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditEvaluationNameDialog({ evaluation, opened, onClose, onSuccess }: EditEvaluationNameDialogProps) {
  const updateMutation = useUpdateEvaluation();

  const form = useForm({
    initialValues: {
      name: evaluation?.name || '',
    },
    validate: {
      name: (value) => (value.trim().length === 0 ? texts.evals.evaluations.nameRequired : null),
    },
  });

  // Update form when evaluation changes
  useEffect(() => {
    if (evaluation) {
      form.setValues({ name: evaluation.name });
    }
  }, [evaluation]);

  const handleSubmit = form.onSubmit((values) => {
    if (!evaluation) return;

    updateMutation.mutate(
      {
        id: evaluation.id,
        data: { name: values.name.trim(), version: evaluation.version },
      },
      {
        onSuccess: () => {
          onClose();
          onSuccess?.();
        },
      },
    );
  });

  if (!evaluation) return null;

  return (
    <Modal opened={opened} onClose={onClose} title={texts.evals.evaluations.editNameTitle} centered>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label={texts.evals.evaluations.nameLabel}
            placeholder={texts.evals.evaluations.namePlaceholder}
            required
            {...form.getInputProps('name')}
            disabled={updateMutation.isPending}
          />

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={onClose} disabled={updateMutation.isPending}>
              {texts.common.cancel}
            </Button>
            <Button type="submit" loading={updateMutation.isPending} disabled={updateMutation.isPending}>
              {texts.common.save}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
