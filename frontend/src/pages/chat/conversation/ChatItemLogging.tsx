import { memo, useState } from 'react';
import { Icon, Markdown } from 'src/components';
import { texts } from 'src/texts';

export interface ChatItemLoggingProps {
  logging: string[];
}

export const ChatItemLogging = memo((props: ChatItemLoggingProps) => {
  const { logging } = props;
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleCollapse = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div>
      {logging?.length > 0 && (
        <div className="relative my-1 rounded-lg border-[1px] border-gray-300 bg-gray-100 p-4 text-sm">
          <div className="flex items-center justify-between">
            <p className="font-bold">{texts.chat.chunksInformation}</p>
            <button
              type="button"
              className="cursor-pointer p-1 hover:rounded hover:bg-gray-300"
              onClick={toggleCollapse}
              aria-label={texts.accessibility.toggleChunksInformation}
              aria-expanded={isExpanded}
            >
              <Icon icon={isExpanded ? 'collapse-up' : 'collapse-down'} size={16} />
            </button>
          </div>
          {isExpanded && (
            <div className="mt-4 break-words">
              {logging.map((l, i) => (
                <Markdown key={i}>{l}</Markdown>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
