import { useEffect, useRef } from 'react';
import { useStateOfSelectedAssistant } from 'src/pages/chat/state/listOfAssistants';
import { useStateOfEnabledAssistants } from 'src/pages/chat/state/listOfAssistants';
import { useMutateNewChat } from './state/listOfChats';

export function NewChatRedirect() {
  const createNewConversation = useMutateNewChat();
  const assistant = useStateOfSelectedAssistant();
  const assistants = useStateOfEnabledAssistants();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!hasRun.current && assistants.length) {
      hasRun.current = true;
      createNewConversation.mutate(assistant.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistant, createNewConversation]);

  return null;
}
