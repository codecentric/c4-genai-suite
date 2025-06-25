import { useEffect, useRef } from 'react';
import { useMutateNewChat } from './state/listOfChats';

export function NewChatRedirect() {
  const createNewConversation = useMutateNewChat();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      createNewConversation.mutate();
    }
  }, [createNewConversation]);

  return null;
}
