import { useEffect, useRef } from 'react';
import { useStateOfSelectedAssistantId } from 'src/pages/chat/state/chat';
import { useStateOfAssistants } from 'src/pages/chat/state/listOfAssistants';
import { useMutateNewChat } from './state/listOfChats';

export function NewChatRedirect() {
  const createNewConversation = useMutateNewChat();
  const assistantId = useStateOfSelectedAssistantId();
  const assistants = useStateOfAssistants();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!hasRun.current && assistants.length) {
      hasRun.current = true;
      createNewConversation.mutate(assistantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantId, createNewConversation]);

  return null;
}
