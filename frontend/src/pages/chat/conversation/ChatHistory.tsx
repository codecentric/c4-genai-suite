import { FileDto } from 'src/api';
import { useProfile } from 'src/hooks';
import { useStateOfIsAiWriting, useStateOfMessages, useStateOfSelectedChatId } from '../state/chat';
import { ChatItem } from './ChatItem/ChatItem';

type ChatHistoryProps = {
  agentName: string;
  llmLogo?: string;
  selectDocument: (chatId: number, messageId: number, documentUri: string) => void;
  onSubmit: (input: string, files?: FileDto[], editMessageId?: number) => void;
};

export function ChatHistory({ agentName, llmLogo, selectDocument, onSubmit }: ChatHistoryProps) {
  const profile = useProfile();
  const messages = useStateOfMessages();
  const allMessagesButLastTwo = messages.slice(0, -2);
  const lastTwoMessages = messages.slice(-2);
  const chatId = useStateOfSelectedChatId();
  const isWriting = useStateOfIsAiWriting();
  const autoScrollContainerForLastMessageExchange = 'grid min-h-full min-w-full max-w-full grid-rows-[max-content_1fr]';

  return (
    <>
      <div className={'grid'}>
        {allMessagesButLastTwo.map((message, i) => (
          <ChatItem
            key={`${i}_${chatId}`}
            agentName={agentName}
            chatId={chatId}
            isWriting={isWriting}
            isLast={i === messages.length - 1}
            isBeforeLast={i === messages.length - 2}
            message={message}
            user={profile}
            llmLogo={llmLogo}
            selectDocument={(documentUri) => selectDocument(chatId, message.id, documentUri)}
            onSubmit={onSubmit}
          />
        ))}
      </div>
      <div className={autoScrollContainerForLastMessageExchange}>
        {lastTwoMessages.map((message, i) => (
          <ChatItem
            key={`${i + messages.length - 2}_${chatId}`}
            agentName={agentName}
            chatId={chatId}
            isWriting={isWriting}
            isLast={i === 1}
            isBeforeLast={i === 0}
            message={message}
            user={profile}
            llmLogo={llmLogo}
            selectDocument={(documentUri) => selectDocument(chatId, message.id, documentUri)}
            onSubmit={onSubmit}
          />
        ))}
      </div>
    </>
  );
}
