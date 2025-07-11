import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ConversationDtoRatingEnum,
  FileDto,
  MessageDtoRatingEnum,
  ResponseError,
  StreamMessageSavedDtoMessageTypeEnum,
  UpdateConversationDto,
  useApi,
} from 'src/api';
import { texts } from 'src/texts';
import { useChatStore } from './zustand/chatStore';
import { useListOfChatsStore } from './zustand/listOfChatsStore';

const getMessagePlaceholderId = (messageType: StreamMessageSavedDtoMessageTypeEnum) => {
  return messageType === 'ai' ? -1 : 0;
};

export const useChatStream = (chatId: number) => {
  const api = useApi();
  const navigate = useNavigate();
  const chatStore = useChatStore();
  const listOfChatsStore = useListOfChatsStore();

  const {
    isLoading: isChatLoading,
    data: loadedChatAndMessages,
    error,
  } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: async () => {
      return {
        chat: await api.conversations.getConversation(chatId),
        messages: await api.conversations.getMessages(chatId),
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
    if (loadedChatAndMessages) {
      chatStore.setMessages(loadedChatAndMessages.messages.items);
      chatStore.setChat(loadedChatAndMessages.chat);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedChatAndMessages, chatStore.setChat]);

  const sendMessage = (chatId: number, input: string, files?: FileDto[], editMessageId?: number) => {
    if (editMessageId) {
      chatStore.setMessages(chatStore.messages.filter((message) => message.id > 0 && message.id < editMessageId));
    }

    chatStore.addMessage({
      type: 'human',
      content: [{ type: 'text', text: input }],
      id: editMessageId ?? getMessagePlaceholderId('human'),
    });
    chatStore.addMessage({ type: 'ai', content: [{ type: 'text', text: '' }], id: getMessagePlaceholderId('ai') });
    chatStore.setIsAiWriting(true);

    chatStore.getStream(chatId, input, files, api, editMessageId).subscribe({
      next: (msg) => {
        if (msg.type === 'error' || msg.type === 'completed') chatStore.setIsAiWriting(false);

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
        chatStore.setIsAiWriting(false);
      },
      complete: () => {
        listOfChatsStore.refetch();
        chatStore.setIsAiWriting(false);
      },
    });
  };

  return { sendMessage, isChatLoading };
};

export const useStateMutateChat = (chatId: number) => {
  const api = useApi();
  const setChat = useChatStore((s) => s.setChat);

  return useMutation({
    mutationFn: (conversionUpdate: UpdateConversationDto) => {
      return api.conversations.patchConversation(chatId, conversionUpdate);
    },
    onSuccess: setChat,
  });
};

export const useConfirmAiAction = (requestId: string) => {
  const api = useApi();

  return useMutation({
    // Fix type in backend to reflect boolean|string instead of using any (see usages)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (result: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      return api.conversations.confirm(requestId, { result });
    },
  });
};

export const useStateMutateChatRating = (chatId: number) => {
  const api = useApi();
  return useMutation({
    mutationFn: (rating: ConversationDtoRatingEnum) => {
      return api.conversations.patchConversation(chatId, { rating });
    },
  });
};

export const useStateMutateMessageRating = (messageId: number) => {
  const api = useApi();
  const chatId = useChatStore((s) => s.chat.id);
  const updateMessage = useChatStore((s) => s.updateMessage);

  return useMutation({
    mutationFn: async (rating: MessageDtoRatingEnum) => {
      if (chatId) {
        await api.conversations.rateMessage(chatId, messageId, { rating });
      }
    },
    onSuccess: (_, rating) => {
      updateMessage(messageId, { rating });
    },
  });
};

export const useStateOfChat = () => useChatStore((s) => s.chat);
export const useStateOfSelectedChatId = () => useChatStore((s) => s.chat.id);
export const useStateOfSelectedAssistantId = () => useChatStore((s) => s.chat.configurationId);
export const useStateOfMessages = () => useChatStore((s) => s.messages);
export const useStateOfIsAiWriting = () => useChatStore((s) => s.isAiWriting);
