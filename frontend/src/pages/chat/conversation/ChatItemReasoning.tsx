import { memo, useEffect, useState } from 'react';
import { Icon, Markdown } from 'src/components';
import { ReasoningStep } from '../state/types';

export interface ChatItemReasoningProps {
  reasoning: ReasoningStep[];
  isStreaming?: boolean;
}

export const ChatItemReasoning = memo((props: ChatItemReasoningProps) => {
  const { reasoning, isStreaming = false } = props;
  const [isOpen, setIsOpen] = useState(true);
  const [animatingSteps, setAnimatingSteps] = useState<Set<string>>(new Set());

  // Auto-open when new reasoning steps are added
  useEffect(() => {
    if (reasoning.length > 0 && !isOpen) {
      setIsOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reasoning.length]); // Intentionally not including isOpen to avoid infinite loop

  // Animate new steps when they appear
  useEffect(() => {
    const newSteps = reasoning.filter((step) => step.status === 'completed' && !animatingSteps.has(step.id));

    if (newSteps.length > 0) {
      const newAnimatingSteps = new Set(animatingSteps);
      newSteps.forEach((step) => newAnimatingSteps.add(step.id));
      setAnimatingSteps(newAnimatingSteps);

      // Remove animation after a delay
      setTimeout(() => {
        setAnimatingSteps((prev) => {
          const updated = new Set(prev);
          newSteps.forEach((step) => updated.delete(step.id));
          return updated;
        });
      }, 1000);
    }
  }, [reasoning, animatingSteps]);

  const toggleCollapse = () => {
    setIsOpen(!isOpen);
  };

  const getStepIcon = (step: ReasoningStep) => {
    switch (step.status) {
      case 'pending':
        return 'more-horizontal';
      case 'in-progress':
        return 'refresh';
      case 'completed':
        return 'thumb-up';
      case 'error':
        return 'alert';
      default:
        return 'more-horizontal';
    }
  };

  const getStepColor = (step: ReasoningStep) => {
    switch (step.status) {
      case 'pending':
        return 'text-gray-500';
      case 'in-progress':
        return 'text-blue-500';
      case 'completed':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  if (!reasoning || reasoning.length === 0) {
    return null;
  }

  return (
    <div className="my-2">
      <div className="relative rounded-lg border-[1px] border-blue-200 bg-blue-50 p-4 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="font-bold text-blue-700">Reasoning Process</p>
            {isStreaming && (
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
                <span className="text-xs text-blue-600">Processing...</span>
              </div>
            )}
          </div>
          <div className="cursor-pointer p-1 hover:rounded hover:bg-blue-200" onClick={toggleCollapse}>
            <button aria-label="toggle reasoning process">
              <Icon icon={isOpen ? 'collapse-down' : 'collapse-up'} size={16} />
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="mt-4 space-y-3">
            {reasoning.map((step) => (
              <div
                key={step.id}
                className={`border-l-2 pl-4 transition-all duration-500 ${step.status === 'completed' ? 'border-green-400' : 'border-gray-300'} ${animatingSteps.has(step.id) ? 'animate-pulse rounded-r-md bg-green-100' : ''} `}
              >
                <div className="mb-1 flex items-center gap-2">
                  <Icon
                    icon={getStepIcon(step)}
                    size={14}
                    className={`${getStepColor(step)} ${step.status === 'in-progress' ? 'animate-spin' : ''}`}
                  />
                  <h4 className="font-medium text-gray-800">{step.title}</h4>
                  <span className="text-xs text-gray-500">{step.timestamp.toLocaleTimeString()}</span>
                </div>
                <div className="break-words text-gray-700">
                  <Markdown>{step.content}</Markdown>
                </div>
              </div>
            ))}

            {/* Loading placeholder for next step when streaming */}
            {isStreaming && (
              <div className="border-l-2 border-gray-300 pl-4">
                <div className="mb-1 flex items-center gap-2">
                  <div className="h-3 w-3 animate-pulse rounded-full bg-gray-400"></div>
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-300"></div>
                </div>
                <div className="mb-1 h-3 w-full animate-pulse rounded bg-gray-200"></div>
                <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200"></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
