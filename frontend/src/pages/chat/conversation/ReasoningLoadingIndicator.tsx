import { memo } from 'react';
import { Icon } from 'src/components';

export interface ReasoningLoadingIndicatorProps {
  currentStep?: string;
  detailed?: boolean;
  message?: string;
  progress?: number;
  className?: string;
}

export const ReasoningLoadingIndicator = memo(
  ({ currentStep, detailed = false, message, progress, className = '' }: ReasoningLoadingIndicatorProps) => {
    const displayMessage = currentStep || message || 'AI is analyzing your request...';

    if (detailed) {
      return (
        <div className={`my-3 rounded-lg border border-gray-300 bg-gray-100 p-4 ${className}`}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Icon icon="refresh" size={20} className="animate-spin text-gray-600" />
              {progress !== undefined && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="h-4 w-4 rounded-full border-2 border-gray-200"
                    style={{
                      background: `conic-gradient(#6b7280 ${progress * 3.6}deg, transparent 0deg)`,
                    }}
                  />
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-800">Reasoning in Progress</p>
                {progress !== undefined && <span className="text-xs text-gray-600">{Math.round(progress)}%</span>}
              </div>
              <p className="mt-1 text-xs text-gray-600">{displayMessage}</p>

              {progress !== undefined && (
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full bg-gray-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Simple mode
    return (
      <div className={`my-2 flex items-center gap-2 text-sm text-gray-600 ${className}`}>
        <span className="text-xs text-gray-600">Thinking</span>
        <div className="flex gap-1">
          {progress !== undefined ? (
            <div className="h-2 w-2 overflow-hidden rounded-full bg-gray-200">
              <div className="animate-pulse rounded-full bg-gray-500" style={{ width: `${progress}%`, height: '100%' }} />
            </div>
          ) : (
            <div className="flex gap-1">
              <div className="h-1 w-1 animate-pulse rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
              <div className="h-1 w-1 animate-pulse rounded-full bg-gray-400" style={{ animationDelay: '200ms' }} />
              <div className="h-1 w-1 animate-pulse rounded-full bg-gray-400" style={{ animationDelay: '400ms' }} />
            </div>
          )}
        </div>
      </div>
    );
  },
);
