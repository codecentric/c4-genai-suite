import { memo } from 'react';
import { Icon } from 'src/components';

export interface ReasoningLoadingIndicatorProps {
  /** The current reasoning step being processed */
  currentStep?: string;
  /** Show a more detailed loading state */
  detailed?: boolean;
  /** Custom message to display */
  message?: string;
  /** Progress percentage (0-100), if available */
  progress?: number;
}

export const ReasoningLoadingIndicator = memo(
  ({ currentStep, detailed = false, message, progress }: ReasoningLoadingIndicatorProps) => {
    const defaultMessage = currentStep ? `Processing: ${currentStep}` : 'Analyzing your request...';
    const displayMessage = message || defaultMessage;

    if (detailed) {
      return (
        <div className="my-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Icon icon="refresh" size={20} className="animate-spin text-blue-600" />
              {progress !== undefined && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="h-4 w-4 rounded-full border-2 border-blue-200"
                    style={{
                      background: `conic-gradient(#3b82f6 ${progress * 3.6}deg, transparent 0deg)`,
                    }}
                  />
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-blue-800">Reasoning in Progress</p>
                {progress !== undefined && <span className="text-xs text-blue-600">{Math.round(progress)}%</span>}
              </div>
              <p className="mt-1 text-xs text-blue-600">{displayMessage}</p>

              {progress !== undefined && (
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-blue-200">
                  <div className="h-full bg-blue-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          </div>

          {/* Animated thinking dots */}
          <div className="mt-3 flex items-center gap-1">
            <span className="text-xs text-blue-600">Thinking</span>
            <div className="flex gap-1">
              <div className="h-1 w-1 animate-pulse rounded-full bg-blue-400" style={{ animationDelay: '0ms' }} />
              <div className="h-1 w-1 animate-pulse rounded-full bg-blue-400" style={{ animationDelay: '200ms' }} />
              <div className="h-1 w-1 animate-pulse rounded-full bg-blue-400" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
        </div>
      );
    }

    // Simple loading indicator
    return (
      <div className="my-2 flex items-center gap-2 text-sm text-blue-600">
        <Icon icon="refresh" size={16} className="animate-spin" />
        <span>{displayMessage}</span>
        <div className="flex gap-1">
          <div className="h-1 w-1 animate-pulse rounded-full bg-blue-400" style={{ animationDelay: '0ms' }} />
          <div className="h-1 w-1 animate-pulse rounded-full bg-blue-400" style={{ animationDelay: '200ms' }} />
          <div className="h-1 w-1 animate-pulse rounded-full bg-blue-400" style={{ animationDelay: '400ms' }} />
        </div>
      </div>
    );
  },
);
