import { Button, Portal } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import type { EvaluationDetailSummary } from 'src/api/generated-eval';
import { Modal } from 'src/components';
import { texts } from 'src/texts';
import { useDeleteEvaluation } from '../hooks/useEvaluationMutations';

interface DeleteEvaluationDialogProps {
  evaluation: EvaluationDetailSummary;
  onClose: () => void;
  onDeleted?: () => void;
}

export function DeleteEvaluationDialog({ evaluation, onClose, onDeleted }: DeleteEvaluationDialogProps) {
  const deleteMutation = useDeleteEvaluation();

  const handleConfirm = () => {
    deleteMutation.mutate(
      {
        id: evaluation.id,
        data: { version: evaluation.version },
      },
      {
        onSuccess: () => {
          onDeleted?.();
          onClose();
        },
      },
    );
  };

  return (
    <Portal>
      <Modal
        onClose={onClose}
        header={texts.evals.evaluations.deleteConfirmTitle}
        footer={
          <fieldset disabled={deleteMutation.isPending}>
            <div className="flex flex-row justify-end gap-4">
              <Button type="button" variant="subtle" onClick={onClose}>
                {texts.common.cancel}
              </Button>
              <Button type="button" color="red" onClick={handleConfirm} loading={deleteMutation.isPending}>
                {texts.common.remove}
              </Button>
            </div>
          </fieldset>
        }
      >
        <div className="flex items-start gap-3">
          <IconAlertTriangle size={24} className="text-error shrink-0" />
          <p className="text-gray-700">{texts.evals.evaluations.deleteConfirmText(evaluation.name)}</p>
        </div>
      </Modal>
    </Portal>
  );
}
