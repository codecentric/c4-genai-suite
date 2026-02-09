import { Loader, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconClock } from '@tabler/icons-react';
import { EvaluationStatus } from 'src/api/generated-eval';
import { texts } from 'src/texts';

interface EvaluationStatusChipProps {
  status: EvaluationStatus;
}

export function EvaluationStatusChip({ status }: EvaluationStatusChipProps) {
  const statusConfig = getStatusConfig(status);

  const chip = (
    <div className={`badge gap-1.5 whitespace-nowrap ${statusConfig.badgeClass}`}>
      {statusConfig.icon}
      <span>{statusConfig.label}</span>
    </div>
  );

  if (statusConfig.tooltip) {
    return (
      <Tooltip label={statusConfig.tooltip} withArrow>
        {chip}
      </Tooltip>
    );
  }

  return chip;
}

function getStatusConfig(status: EvaluationStatus) {
  switch (status) {
    case EvaluationStatus.Pending:
      return {
        label: texts.evals.evaluations.statusPending,
        badgeClass: 'badge-ghost',
        icon: <IconClock size={14} />,
        tooltip: texts.evals.evaluations.statusPendingTooltip,
      };
    case EvaluationStatus.Running:
      return {
        label: texts.evals.evaluations.statusRunning,
        badgeClass: 'badge-info',
        icon: <Loader size={12} />,
        tooltip: texts.evals.evaluations.statusRunningTooltip,
      };
    case EvaluationStatus.Success:
      return {
        label: texts.evals.evaluations.statusSuccess,
        badgeClass: 'badge-success',
        icon: <IconCheck size={14} />,
        tooltip: texts.evals.evaluations.statusSuccessTooltip,
      };
    case EvaluationStatus.Failure:
      return {
        label: texts.evals.evaluations.statusFailure,
        badgeClass: 'badge-error',
        icon: <IconAlertTriangle size={14} />,
        tooltip: texts.evals.evaluations.statusFailureTooltip,
      };
    default:
      return {
        label: String(status),
        badgeClass: 'badge-ghost',
        icon: null,
        tooltip: null,
      };
  }
}
