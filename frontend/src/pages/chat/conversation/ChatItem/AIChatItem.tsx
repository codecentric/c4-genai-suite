import { Box } from '@mantine/core';
import { useClipboard, useDebouncedValue } from '@mantine/hooks';
import { toast } from 'react-toastify';
import { Alert, Markdown } from 'src/components';
import { useProfile } from 'src/hooks';
import { texts } from 'src/texts';
import { useStateOfIsAiWriting } from '../../state/chat';
import { ChatItemDebug } from '../ChatItemDebug';
import { ChatItemLogging } from '../ChatItemLogging';
import ChatItemSources from '../ChatItemSources';
import { ChatItemTools } from '../ChatItemTools';
import { AIChatItemActions } from './AIChatItemActions';
import { AiAvatar } from './AiAvatar';
import { ChatItemProps } from './ChatItemProps';
import { ChatItemUserInput } from './ChatItemUserInput';

export const AIChatItem = ({ agentName, message, isLast, llmLogo, selectDocument }: ChatItemProps) => {
  // MessageDTO ist generated from the backend models.
  // It may be refactored to become a simple string
  // instead of an array with one entry (in the futute ;) ).
  const textContent = message.content[0]?.type === 'text' ? message.content[0].text : '';
  const user = useProfile();
  const isWriting = useStateOfIsAiWriting();
  const clipboard = useClipboard();

  const copyTextToClipboard = () => {
    clipboard.copy(textContent);
    toast(texts.common.copied, { type: 'info' });
  };

  const [debouncedIsWriting] = useDebouncedValue(isWriting, 500);
  const newReply = isWriting || debouncedIsWriting;
  return (
    <div className={'scroll-y-m-4 group box-border max-w-full'} data-testid="chat-item">
      <div className="flex items-center gap-2">
        <AiAvatar llmLogo={llmLogo} />
        <strong>{agentName}</strong>
      </div>
      {message.error && <Alert text={message.error} className="mt-1" />}
      <ChatItemTools tools={message.toolsInUse || {}} />
      {message.ui && <ChatItemUserInput request={message.ui} />}
      <Markdown animateText={isLast && newReply} className="box-border max-w-full">
        {textContent}
      </Markdown>
      {message.sources && message.sources?.length > 0 ? (
        <ChatItemSources sources={message.sources || []} selectDocument={selectDocument} />
      ) : (
        <ChatItemDebug debug={message.debug || []} />
      )}
      {isLast && isWriting && <Box className="animate-loading-dot mt-4 h-3 w-3 rounded-full bg-gray-700" bg="primary" />}
      {!isWriting && <ChatItemLogging logging={message.logging || []} />}
      {!(isWriting && isLast) && (
        <AIChatItemActions
          messageId={message.id}
          copyTextToClipboard={copyTextToClipboard}
          rating={message.rating}
          renderAlways={isLast && !newReply}
          tokenCount={message.tokenCount}
          user={user}
        />
      )}
    </div>
  );
};
