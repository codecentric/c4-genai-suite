import { Button, Menu } from '@mantine/core';
import { IconCopy, IconDots, IconFileDownload, IconPencil, IconTrash } from '@tabler/icons-react';
import type { EvaluationDetailSummary } from 'src/api/generated-eval';
import { texts } from 'src/texts';

interface EvaluationActionsMenuProps {
  evaluation: EvaluationDetailSummary;
  onExport: () => void;
  onEditName: () => void;
  onDelete: () => void;
  onClone?: () => void;
  disabled?: boolean;
}

export function EvaluationActionsMenu({
  evaluation,
  onExport,
  onEditName,
  onDelete,
  onClone,
  disabled = false,
}: EvaluationActionsMenuProps) {
  const canExport = evaluation.status === 'SUCCESS';
  const canEdit = evaluation.status !== 'RUNNING';
  const canDelete = evaluation.status !== 'RUNNING';

  return (
    <Menu shadow="md" width={200} position="bottom-end">
      <Menu.Target>
        <Button variant="default" rightSection={<IconDots size={16} />} disabled={disabled}>
          Actions
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Evaluation Actions</Menu.Label>

        <Menu.Item leftSection={<IconFileDownload size={16} />} onClick={onExport} disabled={!canExport}>
          {texts.evals.evaluations.exportCsv}
        </Menu.Item>

        <Menu.Item leftSection={<IconPencil size={16} />} onClick={onEditName} disabled={!canEdit}>
          {texts.evals.evaluations.editName}
        </Menu.Item>

        {onClone && (
          <Menu.Item leftSection={<IconCopy size={16} />} onClick={onClone} disabled={evaluation.status === 'RUNNING'}>
            {texts.evals.evaluations.cloneEvaluation}
          </Menu.Item>
        )}

        <Menu.Divider />

        <Menu.Item leftSection={<IconTrash size={16} />} onClick={onDelete} disabled={!canDelete} color="red">
          {texts.evals.evaluations.deleteEvaluation}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
