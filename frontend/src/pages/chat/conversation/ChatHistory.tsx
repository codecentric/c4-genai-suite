import { FileDto } from 'src/api';
import { useProfile } from 'src/hooks';
import { ChatMessage } from '../state';
import { ChatItem } from './ChatItem/ChatItem';

type ChatHistoryProps = {
  agentName: string;
  isWriting?: boolean;
  messages: ChatMessage[];
  conversationId: number;
  llmLogo?: string;
  selectDocument: (conversationId: number, messageId: number, documentUri: string) => void;
  onSubmit: (input: string, files?: FileDto[], editMessageId?: number) => void;
};

export function ChatHistory({
  agentName,
  conversationId,
  isWriting,
  llmLogo,
  messages,
  selectDocument,
  onSubmit,
}: ChatHistoryProps) {
  const profile = useProfile();
  const allMessagesButLastTwo = messages.slice(0, -2);
  const lastTwoMessages = messages.slice(-2);
  const autoScrollContainerForLastMessageExchange = 'grid min-h-full min-w-full max-w-full grid-rows-[max-content_1fr]';

  return (
    <>
      <div className={'grid'}>
        {allMessagesButLastTwo.map((message, i) => (
          <ChatItem
            key={`${i}_${conversationId}`}
            agentName={agentName}
            conversationId={conversationId}
            isWriting={isWriting}
            isLast={i === messages.length - 1}
            isBeforeLast={i === messages.length - 2}
            message={message}
            user={profile}
            llmLogo={llmLogo}
            selectDocument={(documentUri) => selectDocument(conversationId, message.id, documentUri)}
            onSubmit={onSubmit}
          />
        ))}
      </div>
      <div className={autoScrollContainerForLastMessageExchange}>
        {lastTwoMessages.map((message, i) => (
          <ChatItem
            key={`${i + messages.length - 2}_${conversationId}`}
            agentName={agentName}
            conversationId={conversationId}
            isWriting={isWriting}
            isLast={i === 1}
            isBeforeLast={i === 0}
            message={message}
            user={profile}
            llmLogo={llmLogo}
            selectDocument={(documentUri) => selectDocument(conversationId, message.id, documentUri)}
            onSubmit={onSubmit}
          />
        ))}
      </div>
    </>
  );
}
