import { Tooltip, Loader } from '@mantine/core';
import { IconCheck, IconAlertTriangle } from '@tabler/icons-react';
import { QACatalogStatus } from 'src/api/generated-eval';
import { texts } from 'src/texts';

interface QaCatalogStatusChipProps {
  status: QACatalogStatus;
  error?: string | null;
}

export function QaCatalogStatusChip({ status, error }: QaCatalogStatusChipProps) {
  const statusConfig = getStatusConfig(status, error);

  const chip = (
    <div className={`badge gap-1.5 ${statusConfig.badgeClass}`}>
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

function getStatusConfig(status: QACatalogStatus, error?: string | null) {
  switch (status) {
    case QACatalogStatus.Generating:
      return {
        label: texts.evals.qaCatalog.statusGenerating,
        badgeClass: 'badge-warning',
        icon: <Loader size={12} />,
        tooltip: texts.evals.qaCatalog.statusGeneratingTooltip,
      };
    case QACatalogStatus.Ready:
      return {
        label: texts.evals.qaCatalog.statusReady,
        badgeClass: 'badge-success',
        icon: <IconCheck size={14} />,
        tooltip: texts.evals.qaCatalog.statusReadyTooltip,
      };
    case QACatalogStatus.Failure:
      return {
        label: texts.evals.qaCatalog.statusFailure,
        badgeClass: 'badge-error',
        icon: <IconAlertTriangle size={14} />,
        tooltip: error
          ? texts.evals.qaCatalog.statusFailureTooltip(error)
          : texts.evals.qaCatalog.statusFailure,
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
