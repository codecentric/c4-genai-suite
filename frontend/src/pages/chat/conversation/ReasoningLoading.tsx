import { memo } from 'react';
import { Icon } from 'src/components';

export interface ReasoningLoadingProps {
  isVisible: boolean;
  currentStep?: string;
  progress?: number; // 0-100, if undefined shows indeterminate
  estimatedTimeRemaining?: number; // in seconds
  onCancel?: () => void;
}

export const ReasoningLoading = memo((props: ReasoningLoadingProps) => {
  const { isVisible, currentStep, progress, estimatedTimeRemaining, onCancel } = props;

  if (!isVisible) {
    return null;
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  return (
    <div className="my-3 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Animated thinking icon */}
          <div className="relative">
            <Icon icon="refresh" size={20} className="animate-spin text-blue-600" />
            <div className="absolute -inset-1 animate-pulse rounded-full bg-blue-200 opacity-20"></div>
          </div>

          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-blue-800">Reasoning in progress</span>
              <div className="flex space-x-1">
                <div className="h-1 w-1 animate-bounce rounded-full bg-blue-600" style={{ animationDelay: '0ms' }}></div>
                <div className="h-1 w-1 animate-bounce rounded-full bg-blue-600" style={{ animationDelay: '150ms' }}></div>
                <div className="h-1 w-1 animate-bounce rounded-full bg-blue-600" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>

            {currentStep && <p className="mt-1 text-sm text-blue-600">{currentStep}</p>}
          </div>
        </div>

        {/* Cancel button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded p-1 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label="Cancel reasoning"
            title="Cancel reasoning process"
          >
            <Icon icon="close" size={16} />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {progress !== undefined && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-blue-600">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            >
              <div className="h-full w-full animate-pulse bg-white opacity-20"></div>
            </div>
          </div>
        </div>
      )}

      {/* Indeterminate progress bar */}
      {progress === undefined && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100">
            <div className="h-2 animate-pulse rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          </div>
        </div>
      )}

      {/* Estimated time remaining */}
      {estimatedTimeRemaining !== undefined && estimatedTimeRemaining > 5 && (
        <div className="mt-2 text-xs text-blue-600">Estimated time remaining: {formatTime(estimatedTimeRemaining)}</div>
      )}
    </div>
  );
});
