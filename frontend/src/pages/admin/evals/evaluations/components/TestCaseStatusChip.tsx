import { Loader } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconClock, IconRocket } from '@tabler/icons-react';
import { TestCaseStatus } from 'src/api/generated-eval';

interface TestCaseStatusChipProps {
  status: TestCaseStatus;
}

export function TestCaseStatusChip({ status }: TestCaseStatusChipProps) {
  const statusConfig = getStatusConfig(status);

  return (
    <div className={`badge gap-1.5 ${statusConfig.badgeClass}`}>
      {statusConfig.icon}
      <span>{statusConfig.label}</span>
    </div>
  );
}

function getStatusConfig(status: TestCaseStatus) {
  switch (status) {
    case TestCaseStatus.Pending:
      return {
        label: 'Pending',
        badgeClass: 'badge-ghost',
        icon: <IconClock size={14} />,
      };
    case TestCaseStatus.RetrievingAnswer:
      return {
        label: 'Retrieving',
        badgeClass: 'badge-info',
        icon: <IconRocket size={14} />,
      };
    case TestCaseStatus.Evaluating:
      return {
        label: 'Evaluating',
        badgeClass: 'badge-warning',
        icon: <Loader size={12} />,
      };
    case TestCaseStatus.Success:
      return {
        label: 'Success',
        badgeClass: 'badge-success',
        icon: <IconCheck size={14} />,
      };
    case TestCaseStatus.Failure:
      return {
        label: 'Failed',
        badgeClass: 'badge-error',
        icon: <IconAlertTriangle size={14} />,
      };
    default:
      return {
        label: String(status),
        badgeClass: 'badge-ghost',
        icon: null,
      };
  }
}
