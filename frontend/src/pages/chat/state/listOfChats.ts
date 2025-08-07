import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { ConversationDto, useApi } from 'src/api';
import { useTransientContext, useTransientNavigate } from 'src/hooks';
import { buildError } from 'src/lib';
import { useStateOfChat } from 'src/pages/chat/state/chat';
import { useStateOfAssistants } from 'src/pages/chat/state/listOfAssistants';
import { texts } from 'src/texts';
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

  const chat = useStateOfChat();
  const removeChat = useListOfChatsStore((s) => s.removeChat);
  const createNewChat = useMutateNewChat();

  return useMutation({
    mutationFn: (id: number) => api.conversations.deleteConversation(id),
    onSuccess: (_, deletedId) => {
      removeChat(deletedId);
      if (deletedId === chat.id) {
        createNewChat.mutate(chat.configurationId);
      }
    },
    onError: async () => {
      toast.error(await buildError(texts.chat.removeConversationFailed, texts.common.reloadAndTryAgain));
    },
  });
};

export const useStateMutateRemoveAllChats = () => {
  const api = useApi();
  const assistantId = useStateOfChat().configurationId;
  const setChats = useListOfChatsStore((s) => s.setChats);
  const createNewChat = useMutateNewChat();

  return useMutation({
    mutationFn: () => api.conversations.deleteConversations(),
    onSuccess: () => {
      setChats([]);
      createNewChat.mutate(assistantId);
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
  const assistants = useStateOfAssistants();

  return useMutation({
    mutationFn: (assistantId?: number) =>
      api.conversations.postConversation({
        configurationId: assistants.find((x) => x.id === assistantId)?.id ?? assistants?.[0].id,
        context,
      }),
    onSuccess: (chat) => navigate(`/chat/${chat.id}`),
  });
};

export const useStateOfChats = () => useListOfChatsStore((s) => s.chats);

/**
 * @description returns a function that is true if the provided conversation id
 * points to an empty conversion.
 **/
export const useStateOfChatEmptiness = () => {
  const api = useApi();
  return async (id: number) => {
    const { items } = await api.conversations.getMessages(id);
    return items.length === 0;
  };
};
