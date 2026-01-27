import { memo } from 'react';
import { Markdown } from 'src/components';

interface ChatItemDebugProps {
  // The debug records.
  debug: string[];
}

export const ChatItemDebug = memo((props: ChatItemDebugProps) => {
  const { debug } = props;

  return (
    <>
      {debug.length > 0 && (
        <div className="relative my-1 rounded-lg border-[1px] border-gray-300 p-4 text-sm" data-testid="chat-item-debug">
          {debug.map((d, i) => (
            <Markdown key={i}>{d}</Markdown>
          ))}
        </div>
      )}
    </>
  );
});
