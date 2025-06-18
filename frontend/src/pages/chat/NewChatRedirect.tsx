import { useEffect, useRef } from 'react';
import { useMutateNewConversation } from './state';

export function NewChatRedirect() {
  const createNewConversation = useMutateNewConversation();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      createNewConversation.mutate();
    }
  }, [createNewConversation]);

  return null;
}
