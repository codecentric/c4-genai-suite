import { Progress } from '@mantine/core';
import type { TestCaseProgress } from 'src/api/generated-eval';

interface EvaluationProgressBarProps {
  progress: TestCaseProgress;
  showLabel?: boolean;
}

export function EvaluationProgressBar({ progress, showLabel = true }: EvaluationProgressBarProps) {
  const percentage = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="w-full">
      <Progress value={percentage} size="sm" />
      {showLabel && (
        <div className="mt-1 text-xs text-gray-600">
          {progress.done} / {progress.total} test cases completed
        </div>
      )}
    </div>
  );
}
