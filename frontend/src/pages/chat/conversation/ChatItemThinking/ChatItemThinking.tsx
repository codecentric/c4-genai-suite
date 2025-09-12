import { Box, Collapse, Text } from '@mantine/core';
import { IconBrain, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useState } from 'react';
import { Markdown } from 'src/components';

interface ChatItemThinkingProps {
  thinking?: string;
  isThinking?: boolean;
}

export const ChatItemThinking = ({ thinking, isThinking }: ChatItemThinkingProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!thinking && !isThinking) return null;

  const thinkingText = thinking || '';
  const hasContent = thinkingText.trim().length > 0;

  return (
    <Box className="mt-2 rounded-r-lg border-l-2 border-amber-300 bg-amber-50 dark:bg-amber-900/20">
      <button
        className="flex w-full items-center gap-2 rounded-r-lg p-3 text-left transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/30"
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={!hasContent}
      >
        <IconBrain size={16} className="flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <Text size="sm" className="flex-1 font-medium text-amber-800 dark:text-amber-200">
          {isThinking ? 'Thinking...' : 'Reasoning Process'}
        </Text>
        {hasContent && (
          <div className="flex-shrink-0">
            {isExpanded ? (
              <IconChevronDown size={16} className="text-amber-600 dark:text-amber-400" />
            ) : (
              <IconChevronRight size={16} className="text-amber-600 dark:text-amber-400" />
            )}
          </div>
        )}
        {isThinking && (
          <div className="flex space-x-1">
            <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500 delay-75" />
            <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500 delay-150" />
          </div>
        )}
      </button>

      <Collapse in={isExpanded && hasContent}>
        <Box className="px-3 pb-3">
          <div className="rounded border border-amber-200 bg-white p-3 dark:border-amber-700 dark:bg-gray-800">
            <Markdown className="prose-sm max-w-none text-sm">{thinkingText}</Markdown>
          </div>
        </Box>
      </Collapse>
    </Box>
  );
};
