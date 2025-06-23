import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Observable } from 'rxjs';
import { create } from 'zustand';
import {
  AppClient,
  ConversationDto,
  ConversationDtoRatingEnum,
  FileDto,
  MessageDto,
  MessageDtoRatingEnum,
  ResponseError,
  SourceDto,
  StreamEventDto,
  StreamMessageSavedDtoMessageTypeEnum,
  StreamUIRequestDto,
  UpdateConversationDto,
  useApi,
} from 'src/api';
import { useTransientContext, useTransientNavigate } from 'src/hooks';
import { buildError } from 'src/lib';
import { texts } from 'src/texts';
import { useUserBucket } from './useUserBucket';

type MessageMetaInfoState = {
  toolsInUse: Record<string, 'Started' | 'Completed'>;
  tokenCount?: number;
  debug: string[];
  sources: SourceDto[];
  logging: string[];
  error?: string;
  isAiWriting?: boolean;
  ui?: StreamUIRequestDto;
};

const getMessagePlaceholderId = (messageType: StreamMessageSavedDtoMessageTypeEnum) => {
  return messageType === 'ai' ? -1 : 0;
};

export type ChatMessage = MessageDto & Partial<MessageMetaInfoState>;

export const useMutateNewConversation = () => {
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
    onSuccess: (conversation) => {
      navigate(`/chat/${conversation.id}`);
    },
  });
};

export const useStateMutateConversation = (conversationId: number) => {
  const api = useApi();
  const setConversation = useChatStore((s) => s.setConversation);

  return useMutation({
    mutationFn: (conversionUpdate: UpdateConversationDto) => {
      return api.conversations.patchConversation(conversationId, conversionUpdate);
    },
    onSuccess: (conversation) => {
      setConversation(conversation);
    },
  });
};

export const useStateMutateConversationRating = (conversationId: number) => {
  const api = useApi();
  return useMutation({
    mutationFn: (rating: ConversationDtoRatingEnum) => {
      return api.conversations.patchConversation(conversationId, { rating });
    },
  });
};

export const useStateMutateMessageRating = (messageId: number) => {
  const api = useApi();
  const selectedConversationId = useListOfChatsStore((s) => s.selectedConversationId);
  const updateMessage = useChatStore((s) => s.updateMessage);

  return useMutation({
    mutationFn: async (rating: MessageDtoRatingEnum) => {
      if (selectedConversationId) {
        await api.conversations.rateMessage(selectedConversationId, messageId, { rating });
      }
    },
    onSuccess: (_, rating) => {
      updateMessage(messageId, { rating });
    },
  });
};

export const useStateMutateDuplicateConversation = () => {
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

export const useStateMutateRemoveAllConversations = () => {
  const api = useApi();
  const setSelectedConversationId = useListOfChatsStore((s) => s.setSelectedConversationId);
  const setConversations = useListOfChatsStore((s) => s.setConversations);
  const createNewConversation = useMutateNewConversation();

  return useMutation({
    mutationFn: () => api.conversations.deleteConversations(),
    onSuccess: () => {
      setSelectedConversationId(null); // this may not even be needed due to next line
      setConversations([]);
      createNewConversation.mutate();
    },
    onError: async (error) => {
      toast.error(await buildError(texts.chat.clearConversationsFailed, error));
    },
  });
};

export const useStateMutateRemoveConversation = () => {
  const api = useApi();
  const setSelectedConversationId = useListOfChatsStore((s) => s.setSelectedConversationId);
  const selectedConversationId = useListOfChatsStore((s) => s.selectedConversationId);
  const removeConversation = useListOfChatsStore((s) => s.removeConversation);
  const createNewConversation = useMutateNewConversation();

  return useMutation({
    mutationFn: (id: number) => api.conversations.deleteConversation(id),
    onSuccess: (_, deletedId) => {
      removeConversation(deletedId);
      if (deletedId === selectedConversationId) {
        setSelectedConversationId(null); // this may not even be needed due to next line
        createNewConversation.mutate();
      }
    },
    onError: async () => {
      toast.error(await buildError(texts.chat.removeConversationFailed, texts.common.reloadAndTryAgain));
    },
  });
};

export const useStateMutateRenameConversation = () => {
  const api = useApi();
  const setConversation = useListOfChatsStore((s) => s.setConversation);

  return useMutation({
    mutationFn: ({ conversation, name }: { conversation: ConversationDto; name: string }) =>
      api.conversations.patchConversation(conversation.id, { name, isNameSetManually: true }),
    onSuccess: (conversation) => {
      setConversation(conversation);
    },
    onError: async () => {
      toast.error(await buildError(texts.chat.renameConversationFailed, texts.common.reloadAndTryAgain));
    },
  });
};

/**
 * @description returns a function that is true if the conversion id provided
 * points to an empty conversion.
 **/
export const useStateOfConversationEmptiness = () => {
  const api = useApi();
  const conversations = useListOfChatsStore((s) => s.conversations);
  return async (id: number) => {
    const valueToCheckIfEmpty = conversations.some((c) => c.id === id).valueOf();
    console.log({ valueToCheckIfEmpty }); // check if api call needed
    const { items } = await api.conversations.getMessages(id);
    return items.length === 0;
  };
};

/**
 * @description Initially loads the list of all known conversations to make it
 * available in global state.
 **/
export const useListOfChatsInit = () => {
  const api = useApi();
  const setConversations = useListOfChatsStore((s) => s.setConversations);
  const setRefetchFn = useListOfChatsStore((s) => s.setRefetchFn);

  const initialQueryGetConversations = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.conversations.getConversations(),
  });

  useEffect(() => {
    if (initialQueryGetConversations.data) setConversations(initialQueryGetConversations.data.items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQueryGetConversations.data]);

  useEffect(() => {
    const refetchFn = () => {
      void initialQueryGetConversations.refetch();
    };
    setRefetchFn(refetchFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQueryGetConversations.refetch]);
};

type ChatState = {
  messages: ChatMessage[];
  conversation: ConversationDto;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (
    messageId: number,
    messageUpdate: Partial<ChatMessage> | ((oldMessage: ChatMessage) => Partial<ChatMessage>),
  ) => void;
  updateLastMessage: (messageUpdate: Partial<ChatMessage> | ((oldMessage: ChatMessage) => Partial<ChatMessage>)) => void;
  appendLastMessage: (text: string) => void;
  setConversation: (conversation: ConversationDto) => void;
  isAiWritting?: boolean;
  setIsAiWritting: (isAiWritting: boolean) => void;
  getStream: (
    conversationId: number,
    input: string,
    files: FileDto[] | undefined,
    api: AppClient,
    editMessageId: number | undefined,
  ) => Observable<StreamEventDto>;
};

/**
 * Contains everything that is part of the currently open conversion.
 **/
const useChatStore = create<ChatState>()((set) => {
  return {
    conversation: { id: 0, configurationId: -1, createdAt: new Date() },
    messages: [],
    getStream: (conversationId, query, files, api, editMessageId) =>
      api.stream.streamPrompt(conversationId, { query, files }, editMessageId),
    // We may want to improve readability here using "immer".
    // However, we should also store the message text (including the images as markdown)
    // into a simple string variable.
    // It seems some chunk structure was abused to fit the UI code in the past.
    appendLastMessage: (text) =>
      set((state) => {
        const lastMsg = state.messages.pop();
        if (lastMsg && lastMsg.content[0]) {
          const contentItem = lastMsg.content[0];
          if (contentItem.type === 'text') {
            const newText = contentItem.text + text;
            const newMsg: MessageDto = { ...lastMsg, content: [{ type: 'text', text: newText }] };
            return { messages: [...state.messages, newMsg] };
          }
        }
        return { messages: state.messages };
      }),
    updateLastMessage: (messageUpdate) =>
      set((state) => {
        const lastMsg = state.messages.pop();
        if (!lastMsg) return { messages: state.messages };
        const messageUpdates = typeof messageUpdate === 'function' ? messageUpdate(lastMsg) : messageUpdate;
        const newMsg: MessageDto = { ...lastMsg, ...messageUpdates };
        return { messages: [...state.messages, newMsg] };
      }),
    updateMessage: (messageId, messageUpdate) =>
      set((state) => {
        const selectedMsg = state.messages.find((msg) => msg.id === messageId);
        if (!selectedMsg) return { messages: state.messages };
        const messageUpdates = typeof messageUpdate === 'function' ? messageUpdate(selectedMsg) : messageUpdate;
        const newMsg: MessageDto = { ...selectedMsg, ...messageUpdates };
        const messages = state.messages.map((msg) => (msg.id === messageId ? newMsg : msg));
        return { messages };
      }),
    addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
    setMessages: (messages) => set({ messages, isAiWritting: false }),
    setConversation: (conversation) => set({ conversation }),
    setIsAiWritting: (isAiWritting) => set({ isAiWritting }),
  };
});

type ListOfChatsState = {
  selectedConversationId: null | number;
  setSelectedConversationId: (id: null | number) => void;
  conversations: ConversationDto[];
  setConversations: (conversations: ConversationDto[]) => void;
  setConversation: (conversation: ConversationDto) => void;
  removeConversation: (id: number) => void;
  refetch: VoidFunction;
  setRefetchFn: (refetchFn: VoidFunction) => void;
};

/**
 * This is the list of all conversions a user has access to, since he created
 * them at some point in the past.
 **/
const useListOfChatsStore = create<ListOfChatsState>()((set) => ({
  selectedConversationId: null,
  setSelectedConversationId: (id: null | number) => set({ selectedConversationId: id }),
  conversations: [],
  setConversations: (conversations) => set({ conversations }),
  setConversation: (conversation) =>
    set(({ conversations }) => {
      const exists = conversations.some((existingConversation) => existingConversation.id === conversation.id);
      if (!exists) return { conversations: [...conversations, conversation] };
      return {
        conversations: conversations.map((existingConversation) =>
          existingConversation.id === conversation.id ? conversation : existingConversation,
        ),
      };
    }),
  removeConversation: (id) => set((state) => ({ conversations: state.conversations.filter((x) => x.id !== id) })),
  refetch: () => {},
  setRefetchFn: (refetch) => set({ refetch }),
}));

export const useChatStream = (conversationId: number) => {
  const api = useApi();
  const navigate = useNavigate();
  const chatStore = useChatStore();
  const listOfChatsStore = useListOfChatsStore();

  const {
    isLoading: isConversationLoading,
    data: loadedConversationAndMessages,
    error,
  } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      return {
        conversation: await api.conversations.getConversation(conversationId),
        messages: await api.conversations.getMessages(conversationId),
      };
    },
    refetchOnWindowFocus: false,
    retry: (failureCount, error: ResponseError) =>
      // if we receive 404 or 403 from the server, then don't retry. Otherwise retry 3 times (default behavior).
      error?.response?.status !== 404 && error?.response?.status !== 403 && failureCount < 3,
  });
  useEffect(() => {
    if (error) {
      if (error.response.status === 403) {
        toast.error(texts.chat.noAccessToConversation);
        void navigate('/chat');
      } else if (error.response.status === 404) {
        toast.error(texts.chat.conversationNotFound);
        void navigate('/chat');
      } else {
        toast.error(`${texts.chat.errorLoadingMessagesOrConversation} ${texts.common.reloadAndTryAgain}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  useEffect(() => {
    if (loadedConversationAndMessages) {
      chatStore.setMessages(loadedConversationAndMessages.messages.items);
      chatStore.setConversation(loadedConversationAndMessages.conversation);
      listOfChatsStore.setSelectedConversationId(loadedConversationAndMessages.conversation.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedConversationAndMessages, chatStore.setConversation]);

  const sendMessage = (conversationId: number, input: string, files?: FileDto[], editMessageId?: number) => {
    if (editMessageId) {
      chatStore.setMessages(chatStore.messages.filter((message) => message.id > 0 && message.id < editMessageId));
    }

    chatStore.addMessage({
      type: 'human',
      content: [{ type: 'text', text: input }],
      id: editMessageId ?? getMessagePlaceholderId('human'),
    });
    chatStore.addMessage({ type: 'ai', content: [{ type: 'text', text: '' }], id: getMessagePlaceholderId('ai') });
    chatStore.setIsAiWritting(true);

    chatStore.getStream(conversationId, input, files, api, editMessageId).subscribe({
      next: (msg) => {
        if (msg.type === 'error' || msg.type === 'completed') chatStore.setIsAiWritting(false);

        switch (msg.type) {
          case 'chunk': {
            const chunk = msg.content[0];
            if (chunk.type === 'text') chatStore.appendLastMessage(chunk.text);
            if (chunk.type === 'image_url') chatStore.appendLastMessage(`![image](${chunk.image.url})`);
            return;
          }
          case 'tool_start':
            return chatStore.updateLastMessage((oldMessage) => ({
              toolsInUse: { ...oldMessage.toolsInUse, [msg.tool.name]: 'Started' },
            }));
          case 'tool_end':
            return chatStore.updateLastMessage((oldMessage) => ({
              toolsInUse: { ...oldMessage.toolsInUse, [msg.tool.name]: 'Completed' },
            }));
          case 'debug':
            return chatStore.updateLastMessage((oldMessage) => ({ debug: [...(oldMessage.debug || []), msg.content] }));
          case 'sources':
            return chatStore.updateLastMessage((oldMessage) => ({ sources: [...(oldMessage.sources || []), ...msg.content] }));
          case 'logging':
            return chatStore.updateLastMessage((oldMessage) => ({ logging: [...(oldMessage.logging || []), msg.content] }));
          case 'error':
            return chatStore.updateLastMessage({ error: msg.message });
          case 'completed':
            return chatStore.updateLastMessage({ tokenCount: msg.metadata.tokenCount });
          case 'saved':
            return chatStore.updateMessage(getMessagePlaceholderId(msg.messageType), { id: msg.messageId });
          case 'ui':
            return chatStore.updateLastMessage({ ui: msg.request });
          case 'summary':
            listOfChatsStore.refetch();
        }
      },
      error: (error: string | Error) => {
        const message = error instanceof Error ? error.message : error;
        chatStore.updateLastMessage({ error: message });
        chatStore.setIsAiWritting(false);
      },
      complete: () => {
        listOfChatsStore.refetch();
        chatStore.setIsAiWritting(false);
      },
    });
  };

  return { sendMessage, isConversationLoading };
};

export const useStateOfConversation = () => useChatStore((s) => s.conversation);
export const useStateOfMessages = () => useChatStore((s) => s.messages);
export const useStateOfIsAiWritting = () => useChatStore((s) => s.isAiWritting);
export const useStateOfSelectedConversationId = () => useListOfChatsStore((s) => s.selectedConversationId);
export const useStateOfConversations = () => useListOfChatsStore((s) => s.conversations);
