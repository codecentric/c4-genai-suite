import { Button, Portal } from '@mantine/core';
import type { Metric } from 'src/api/generated-eval';
import { Modal } from 'src/components';
import { texts } from 'src/texts';
import { useDeleteMetric } from '../hooks/useMetricMutations';

interface DeleteMetricDialogProps {
  metric: Metric;
  onClose: () => void;
  onDeleted?: () => void;
}

export function DeleteMetricDialog({ metric, onClose, onDeleted }: DeleteMetricDialogProps) {
  const deleteMutation = useDeleteMetric();

  const handleConfirm = () => {
    deleteMutation.mutate(
      {
        id: metric.id,
        data: { version: metric.version },
      },
      {
        onSuccess: () => {
          onDeleted?.();
          onClose();
        },
      }
    );
  };

  return (
    <Portal>
      <Modal
        onClose={onClose}
        header={texts.evals.metric.deleteConfirmTitle}
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
        <p className="text-gray-700">
          {texts.evals.metric.deleteConfirmText(metric._configuration.name)}
        </p>
      </Modal>
    </Portal>
  );
}
