import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import type { EvaluationDetailSummary } from 'src/api/generated-eval';
import { texts } from 'src/texts';
import { useDeleteEvaluation } from '../hooks/useEvaluationMutations';

interface DeleteEvaluationDialogProps {
  evaluation: EvaluationDetailSummary | null;
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DeleteEvaluationDialog({ evaluation, opened, onClose, onSuccess }: DeleteEvaluationDialogProps) {
  const deleteMutation = useDeleteEvaluation();

  const handleDelete = () => {
    if (!evaluation) return;

    deleteMutation.mutate(
      {
        id: evaluation.id,
        data: { version: evaluation.version },
      },
      {
        onSuccess: () => {
          onClose();
          onSuccess?.();
        },
      },
    );
  };

  if (!evaluation) return null;

  return (
    <Modal opened={opened} onClose={onClose} title={texts.evals.evaluations.deleteConfirmTitle} centered>
      <Stack gap="md">
        <Group gap="sm">
          <IconAlertTriangle size={24} className="text-error" />
          <Text size="sm">{texts.evals.evaluations.deleteConfirmText(evaluation.name)}</Text>
        </Group>

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose} disabled={deleteMutation.isPending}>
            {texts.common.cancel}
          </Button>
          <Button color="red" onClick={handleDelete} loading={deleteMutation.isPending} disabled={deleteMutation.isPending}>
            {texts.common.remove}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
