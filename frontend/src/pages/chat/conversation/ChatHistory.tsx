import { useCallback } from 'react';
import { FileDto } from 'src/api';
import { useSidebarState } from 'src/hooks/stored';
import { useStateOfMessages, useStateOfSelectedChatId, useStateOfSelectedDocument } from '../state/chat';
import { ChatItem } from './ChatItem/ChatItem';

type ChatHistoryProps = {
  agentName: string;
  editMessage: (input: string, files?: FileDto[], editMessageId?: number) => void;
};

export function ChatHistory({ agentName, editMessage }: ChatHistoryProps) {
  const messages = useStateOfMessages();
  const allMessagesButLastTwo = messages.slice(0, -2);
  const lastTwoMessages = messages.slice(-2);
  const chatId = useStateOfSelectedChatId();
  const autoScrollContainerForLastMessageExchange = 'grid min-h-full min-w-full max-w-full grid-rows-[max-content_1fr]';

  const [_, setSidebarRight] = useSidebarState('sidebar-right');

  const { setSelectedDocument } = useStateOfSelectedDocument();
  const selectDocument = useCallback(
    (messageId: number, documentUri: string) => {
      setSelectedDocument({ conversationId: chatId, messageId, documentUri });
      setSidebarRight(true);
    },
    [chatId, setSelectedDocument, setSidebarRight],
  );

  return (
    <>
      <div className={'grid'}>
        {allMessagesButLastTwo.map((message, i) => (
          <div className="chat-history-deferred grid" data-testid="deferred-chat-item" key={`${i}_${chatId}`}>
            <ChatItem
              agentName={agentName}
              isLast={false}
              isBeforeLast={false}
              message={message}
              selectDocument={selectDocument}
              editMessage={editMessage}
            />
          </div>
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
            selectDocument={selectDocument}
            editMessage={editMessage}
          />
        ))}
      </div>
    </>
  );
}
