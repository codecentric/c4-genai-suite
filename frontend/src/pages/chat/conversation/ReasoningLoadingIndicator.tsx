import { memo, useState } from 'react';
import { Icon, Markdown } from 'src/components';
import { texts } from 'src/texts';

interface ReasoningLoadingIndicatorProps {
  message: string;
  inProgress?: boolean;
}

export const ReasoningLoadingIndicator = memo(({ message, inProgress }: ReasoningLoadingIndicatorProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`my-3 rounded-lg border border-gray-300 bg-gray-100 p-4`}>
      <div className="flex items-start gap-3">
        <div className="relative">
          {inProgress && <Icon icon="refresh" size={20} className="animate-spin text-gray-600" />}
          {!inProgress && <Icon icon="check" size={20} className="text-green-600" />}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-800">{texts.chat.reasoning}</p>
            <button
              onClick={toggleExpanded}
              className="ml-2 text-gray-500 transition-colors hover:text-gray-700"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              <Icon icon={isExpanded ? 'collapse-up' : 'collapse-down'} size={16} className="transition-transform duration-200" />
            </button>
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <Markdown animateText={true} className="mt-1 box-border max-w-full text-xs text-gray-600">
              {message}
            </Markdown>
          </div>
        </div>
      </div>
    </div>
  );
});
