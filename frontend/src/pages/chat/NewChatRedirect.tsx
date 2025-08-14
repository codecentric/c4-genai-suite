import { useEffect, useRef } from 'react';
import { usePersistentState } from 'src/hooks/stored';
import { useStateOfAssistants } from 'src/pages/chat/state/listOfAssistants';
import { useMutateNewChat } from './state/listOfChats';

export function NewChatRedirect() {
  const createNewConversation = useMutateNewChat();
  const [lastSelectedAssistantId] = usePersistentState<number | null>('lastSelectedAssistantId', null);
  const assistants = useStateOfAssistants();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!hasRun.current && assistants.length) {
      hasRun.current = true;
      // Use last selected assistant ID, or fallback to first assistant
      const assistantId = lastSelectedAssistantId || assistants[0]?.id;
      createNewConversation.mutate(assistantId);
    }
  }, [lastSelectedAssistantId, assistants, createNewConversation]);

  return null;
}
