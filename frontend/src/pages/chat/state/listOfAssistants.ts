import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { useApi } from 'src/api';
import { usePersistentState } from 'src/hooks/stored';
import { useStateOfChat } from 'src/pages/chat/state/chat';
import { useListOfAllAssistantsStore, useListOfEnabledAssistantsStore } from './zustand/assistantStore';

/**
 * @description Initially loads the list of all enabled assistants to make it
 * available in global state. Note that this will include extensions.
 **/
export const useListOfEnabledAssistantsInit = () => {
  const api = useApi();
  const setAssistants = useListOfEnabledAssistantsStore((s) => s.setAssistants);

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

export const useStateOfEnabledAssistants = () => useListOfEnabledAssistantsStore((s) => s.assistants);

/**
 * @description Initially loads the list of all assistants to make it
 * available in global state. Note that this will not include extensions.
 **/
export const useListOfAllAssistantsInit = () => {
  const api = useApi();
  const setAssistants = useListOfAllAssistantsStore((s) => s.setAssistants);

  const initialQueryGetAssistants = useQuery({
    queryKey: ['all-configurations'],
    queryFn: () => {
      return api.extensions.getConfigurations();
    },
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (initialQueryGetAssistants.data) setAssistants(initialQueryGetAssistants.data.items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQueryGetAssistants.data]);
};

export const useStateOfAllAssistants = () => useListOfAllAssistantsStore((s) => s.assistants);

export const useStateOfSelectedAssistant = () => {
  const chat = useStateOfChat();
  const assistants = useStateOfEnabledAssistants();
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
