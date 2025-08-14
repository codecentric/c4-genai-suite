import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { useApi } from 'src/api';
import { usePersistentState } from 'src/hooks/stored';
import { useStateOfChat } from 'src/pages/chat/state/chat';
import { useListOfAssistantsStore } from './zustand/assistantStore';

/**
 * @description Initially loads the list of all known assistants to make it
 * available in global state.
 **/
export const useListOfAssistantsInit = () => {
  const api = useApi();
  const setAssistants = useListOfAssistantsStore((s) => s.setAssistants);

  const initialQueryGetAssistants = useQuery({
    queryKey: ['enabled-configurations'],
    queryFn: () => {
      return api.extensions.getConfigurations(true);
    },
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (initialQueryGetAssistants.data) setAssistants(initialQueryGetAssistants.data.items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQueryGetAssistants.data]);
};

export const useStateOfAssistants = () => useListOfAssistantsStore((s) => s.assistants);

export const useStateOfSelectedAssistant = () => {
  const chat = useStateOfChat();
  const assistants = useStateOfAssistants();
  const [lastSelectedAssistantId, setLastSelectedAssistantId] = usePersistentState<number | null>(
    'lastSelectedAssistantId',
    null,
  );

  // without useMemo the assistant will be overridden by the previous chat.configurationId and a change in the assistant dropdown will have no effect
  return useMemo(() => {
    // If the chat has a valid configurationId (greater than 0), use that
    if (chat.configurationId && chat.configurationId > 0) {
      const assistant = assistants.find((x) => x.id === chat.configurationId);
      if (assistant) {
        // Update the persistent state when we find a valid assistant
        setLastSelectedAssistantId(assistant.id);
        return assistant;
      }
    }

    // If no valid configurationId in chat (e.g., new chat with configurationId = -1),
    // try to use the last selected assistant
    if (lastSelectedAssistantId) {
      const assistant = assistants.find((x) => x.id === lastSelectedAssistantId);
      if (assistant) {
        return assistant;
      }
    }

    // Fallback to the first available assistant
    return assistants[0];
  }, [assistants, chat.configurationId, lastSelectedAssistantId, setLastSelectedAssistantId]);
};

/**
 * @description Hook to update the last selected assistant ID
 */
export const useUpdateLastSelectedAssistant = () => {
  const [, setLastSelectedAssistantId] = usePersistentState<number | null>('lastSelectedAssistantId', null);

  return setLastSelectedAssistantId;
};
