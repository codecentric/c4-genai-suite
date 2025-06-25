import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { ConversationDto, useApi } from 'src/api';
import { useTransientContext, useTransientNavigate } from 'src/hooks';
import { buildError } from 'src/lib';
import { texts } from 'src/texts';
import { useUserBucket } from '../useUserBucket';
import { useChatStore } from './zustand/chatStore';
import { useListOfChatsStore } from './zustand/listOfChatsStore';

/**
 * @description Initially loads the list of all known chats to make it
 * available in global state.
 **/
export const useListOfChatsInit = () => {
  const api = useApi();
  const setChats = useListOfChatsStore((s) => s.setChats);
  const setRefetchFn = useListOfChatsStore((s) => s.setRefetchFn);

  const initialQueryGetChats = useQuery({
    queryKey: ['chats'],
    queryFn: () => api.conversations.getConversations(),
  });

  useEffect(() => {
    if (initialQueryGetChats.data) setChats(initialQueryGetChats.data.items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQueryGetChats.data]);

  useEffect(() => {
    const refetchFn = () => {
      void initialQueryGetChats.refetch();
    };
    setRefetchFn(refetchFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQueryGetChats.refetch]);
};

export const useStateMutateDuplicateChat = () => {
  const api = useApi();
  const refetchListOfChats = useListOfChatsStore((s) => s.refetch);

  return useMutation({
    mutationFn: (id: number) => api.conversations.duplicateConversation(id),
    onSuccess: () => {
      refetchListOfChats();
      toast.success(texts.chat.duplicateConversationSuccess);
    },
    onError: async () => {
      toast.error(await buildError(texts.chat.duplicateConversationFailed));
    },
  });
};

export const useStateMutateRenameChat = () => {
  const api = useApi();
  const upsertChat = useListOfChatsStore((s) => s.upsertChat);

  return useMutation({
    mutationFn: ({ chat, name }: { chat: ConversationDto; name: string }) =>
      api.conversations.patchConversation(chat.id, { name, isNameSetManually: true }),
    onSuccess: upsertChat,
    onError: async () => toast.error(await buildError(texts.chat.renameConversationFailed, texts.common.reloadAndTryAgain)),
  });
};

export const useStateMutateRemoveChat = () => {
  const api = useApi();
  const chatId = useChatStore((s) => s.chat.id);
  const removeChat = useListOfChatsStore((s) => s.removeChat);
  const createNewChat = useMutateNewChat();

  return useMutation({
    mutationFn: (id: number) => api.conversations.deleteConversation(id),
    onSuccess: (_, deletedId) => {
      removeChat(deletedId);
      if (deletedId === chatId) {
        createNewChat.mutate();
      }
    },
    onError: async () => {
      toast.error(await buildError(texts.chat.removeConversationFailed, texts.common.reloadAndTryAgain));
    },
  });
};

export const useStateMutateRemoveAllChats = () => {
  const api = useApi();
  const setChats = useListOfChatsStore((s) => s.setChats);
  const createNewChat = useMutateNewChat();

  return useMutation({
    mutationFn: () => api.conversations.deleteConversations(),
    onSuccess: () => {
      setChats([]);
      createNewChat.mutate();
    },
    onError: async (error) => {
      toast.error(await buildError(texts.chat.clearConversationsFailed, error));
    },
  });
};

export const useMutateNewChat = () => {
  const api = useApi();
  const context = useTransientContext();
  const navigate = useTransientNavigate();
  const { selectedConfigurationId } = useUserBucket();
  const { data: loadedConfigurations } = useQuery({
    queryKey: ['enabled-configurations'],
    queryFn: () => api.extensions.getConfigurations(true),
    refetchOnWindowFocus: false,
  });

  return useMutation({
    mutationFn: () =>
      api.conversations.postConversation({
        configurationId: loadedConfigurations?.items.find((x) => x.id === selectedConfigurationId)?.id,
        context,
      }),
    onSuccess: (chat) => navigate(`/chat/${chat.id}`),
  });
};

export const useStateOfChats = () => useListOfChatsStore((s) => s.chats);

/**
 * @description returns a function that is true if the conversion id provided
 * points to an empty conversion.
 **/
export const useStateOfChatEmptiness = () => {
  const api = useApi();
  return async (id: number) => {
    const { items } = await api.conversations.getMessages(id);
    return items.length === 0;
  };
};
