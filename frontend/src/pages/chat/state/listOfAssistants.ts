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
  const [persistentAssistantId] = usePersistentState('selectedAssistantId', null);
  // without useMemo the assistant will be overridden by the previous chat.configurationId and a change in the assistant dropdown will have no effect
  return useMemo(() => {
    let selected = assistants.find((assistant) => assistant.id === chat.configurationId);

    if (selected) {
      return selected;
    }

    if (persistentAssistantId) {
      selected = assistants.find((assistant) => {
        return assistant.id === Number(persistentAssistantId);
      });
      if (selected) {
        return selected;
      }
    }

    return assistants[0];
  }, [assistants, chat.configurationId, persistentAssistantId]);
};
