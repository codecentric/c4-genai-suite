import { FileDto } from 'src/api';
import { useSidebarState } from 'src/hooks/stored';
import { useStateOfMessages, useStateOfSelectedChatId, useStateOfSelectedDocument } from '../state/chat';
import { ChatItem } from './ChatItem/ChatItem';

type ChatHistoryProps = {
  agentName: string;
  llmLogo?: string;
  editMessage: (input: string, files?: FileDto[], editMessageId?: number) => void;
};

export function ChatHistory({ agentName, llmLogo, editMessage }: ChatHistoryProps) {
  const messages = useStateOfMessages();
  const allMessagesButLastTwo = messages.slice(0, -2);
  const lastTwoMessages = messages.slice(-2);
  const chatId = useStateOfSelectedChatId();
  const autoScrollContainerForLastMessageExchange = 'grid min-h-full min-w-full max-w-full grid-rows-[max-content_1fr]';

  const [_, setSidebarRight] = useSidebarState('sidebar-right');

  const { setSelectedDocument } = useStateOfSelectedDocument();

  return (
    <>
      <div className={'grid'}>
        {allMessagesButLastTwo.map((message, i) => (
          <ChatItem
            key={`${i}_${chatId}`}
            agentName={agentName}
            isLast={i === messages.length - 1}
            isBeforeLast={i === messages.length - 2}
            message={message}
            llmLogo={llmLogo}
            selectDocument={(documentUri) => {
              setSelectedDocument({ conversationId: chatId, messageId: message.id, documentUri });
              setSidebarRight(true);
            }}
            editMessage={editMessage}
          />
        ))}
      </div>
      <div className={autoScrollContainerForLastMessageExchange}>
        {lastTwoMessages.map((message, i) => (
          <ChatItem
            key={`${i + messages.length - 2}_${chatId}`}
            agentName={agentName}
            isLast={i === 1}
            isBeforeLast={i === 0}
            message={message}
            llmLogo={llmLogo}
            selectDocument={(documentUri) => {
              setSelectedDocument({ conversationId: chatId, messageId: message.id, documentUri });
              setSidebarRight(true);
            }}
            editMessage={editMessage}
          />
        ))}
      </div>
    </>
  );
}
