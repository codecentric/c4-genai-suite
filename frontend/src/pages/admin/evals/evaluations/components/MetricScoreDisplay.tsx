import { Badge, Tooltip } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import type { GroupedEvaluationTestCaseResult } from 'src/api/generated-eval';

interface MetricScoreDisplayProps {
  result: GroupedEvaluationTestCaseResult;
  metricName?: string;
  showLabel?: boolean;
}

export function MetricScoreDisplay({ result, metricName, showLabel = false }: MetricScoreDisplayProps) {
  const score = result.score;
  const threshold = result.threashold; // Note: API has typo "threashold"
  const success = result.success;

  // Determine color based on score
  const getScoreColor = (): 'red' | 'yellow' | 'green' | 'gray' => {
    if (score === null) return 'gray';
    if (score < 0.5) return 'red';
    if (score < 0.7) return 'yellow';
    return 'green';
  };

  const color = getScoreColor();
  const displayScore = score !== null ? score.toFixed(3) : 'N/A';

  const tooltipContent = [
    metricName && `Metric: ${metricName}`,
    `Score: ${displayScore}`,
    threshold !== null && `Threshold: ${threshold.toFixed(3)}`,
    `Status: ${success ? 'Passed' : 'Failed'}`,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <Tooltip label={tooltipContent} multiline withArrow>
      <Badge variant="filled" color={color} leftSection={success ? <IconCheck size={12} /> : <IconX size={12} />} size="sm">
        {showLabel && metricName ? `${metricName}: ` : ''}
        {displayScore}
      </Badge>
    </Tooltip>
  );
}
