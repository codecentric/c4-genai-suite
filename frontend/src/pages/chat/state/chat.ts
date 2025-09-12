import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import {
  ChatUICallbackResultDto,
  ConversationDtoRatingEnum,
  FileDto,
  MessageDtoRatingEnum,
  ResponseError,
  StreamMessageSavedDtoMessageTypeEnum,
  UpdateConversationDto,
  useApi,
} from 'src/api';
import { texts } from 'src/texts';
import { ReasoningStep } from './types';
import { useChatStore } from './zustand/chatStore';
import { useListOfChatsStore } from './zustand/listOfChatsStore';

const getMessagePlaceholderId = (messageType: StreamMessageSavedDtoMessageTypeEnum) => {
  return messageType === 'ai' ? -1 : 0;
};

export const useChatStream = (chatId: number) => {
  const api = useApi();
  const navigate = useNavigate();
  const chatStore = useChatStore();

  useEffect(() => {
    if (chatStore.currentChatId !== chatId) {
      chatStore.switchToChat(chatId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

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
      // Use preserveIfNewer to avoid overwriting streaming messages
      chatStore.setMessages(chatId, loadedChatAndMessages.messages.items, true);
      chatStore.setChat(chatId, loadedChatAndMessages.chat);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedChatAndMessages, chatId]);

  const sendMessage = (input: string, files?: FileDto[], editMessageId?: number) => {
    // Only cancel existing stream for this specific chat if we're starting a new message
    chatStore.cancelActiveStream(chatId);

    if (editMessageId) {
      const currentMessages = chatStore.chatDataMap.get(chatId)?.messages || [];
      const filteredMessages = currentMessages.filter((message) => message.id > 0 && message.id < editMessageId);
      chatStore.setMessages(chatId, filteredMessages);
    }

    const configurationId = chatStore.chatDataMap.get(chatId)?.chat.configurationId;

    chatStore.addMessage(chatId, {
      type: 'human',
      content: [{ type: 'text', text: input }],
      configurationId: configurationId ?? 0,
      id: editMessageId ?? getMessagePlaceholderId('human'),
    });

    const aiMessageId = getMessagePlaceholderId('ai');
    chatStore.addMessage(chatId, {
      type: 'ai',
      content: [{ type: 'text', text: '' }],
      configurationId: configurationId ?? 0,
      id: aiMessageId,
    });

    // Set which message is being streamed to
    chatStore.setStreamingMessageId(chatId, aiMessageId);
    chatStore.setIsAiWriting(chatId, true);

    // Keep track of the actual message ID after it's saved
    let actualAiMessageId = aiMessageId;

    const subscription = chatStore.getStream(chatId, input, files, api, editMessageId).subscribe({
      next: (msg) => {
        if (msg.type === 'error' || msg.type === 'completed') {
          chatStore.setIsAiWriting(chatId, false);
          chatStore.setStreamingMessageId(chatId, undefined);
        }

        switch (msg.type) {
          case 'chunk': {
            const chunk = msg.content[0];
            if (chunk.type === 'text') chatStore.appendToStreamingMessage(chatId, chunk.text);
            if (chunk.type === 'image_url') chatStore.appendToStreamingMessage(chatId, `![image](${chunk.image.url})`);
            return;
          }
          case 'tool_start':
            return chatStore.updateMessage(chatId, actualAiMessageId, (oldMessage) => ({
              toolsInUse: { ...oldMessage.toolsInUse, [msg.tool.name]: 'Started' },
            }));
          case 'tool_end':
            return chatStore.updateMessage(chatId, actualAiMessageId, (oldMessage) => ({
              toolsInUse: { ...oldMessage.toolsInUse, [msg.tool.name]: 'Completed' },
            }));
          case 'debug':
            return chatStore.updateMessage(chatId, actualAiMessageId, (oldMessage) => ({
              debug: [...(oldMessage.debug || []), msg.content],
            }));
          case 'sources':
            return chatStore.updateMessage(chatId, actualAiMessageId, (oldMessage) => ({
              sources: [...(oldMessage.sources || []), ...msg.content],
            }));
          case 'logging':
            return chatStore.updateMessage(chatId, actualAiMessageId, (oldMessage) => ({
              logging: [...(oldMessage.logging || []), msg.content],
            }));
          case 'error':
            return chatStore.updateMessage(chatId, actualAiMessageId, { error: msg.message });
          case 'completed':
            return chatStore.updateMessage(chatId, actualAiMessageId, { tokenCount: msg.metadata.tokenCount });
          case 'saved':
            if (msg.messageType === 'ai') {
              actualAiMessageId = msg.messageId;
              chatStore.setStreamingMessageId(chatId, msg.messageId);
            }
            return chatStore.updateMessage(chatId, getMessagePlaceholderId(msg.messageType), { id: msg.messageId });
          case 'ui':
            return chatStore.updateMessage(chatId, actualAiMessageId, { ui: msg.request });
          case 'summary':
            listOfChatsStore.refetch();
        }
      },
      error: (error: string | Error) => {
        const message = error instanceof Error ? error.message : error;
        chatStore.updateMessage(chatId, actualAiMessageId, { error: message });
        chatStore.setIsAiWriting(chatId, false);
        chatStore.setStreamingMessageId(chatId, undefined);
      },
      complete: () => {
        listOfChatsStore.refetch();
        chatStore.setIsAiWriting(chatId, false);
        chatStore.setStreamingMessageId(chatId, undefined);
        const currentChatData = chatStore.chatDataMap.get(chatId);
        if (currentChatData?.activeStreamSubscription === subscription) {
          chatStore.setActiveStreamSubscription(chatId, undefined);
        }
      },
    });

    chatStore.setActiveStreamSubscription(chatId, subscription);
  };

  return { sendMessage, isChatLoading };
};

export const useStateMutateChat = (chatId: number) => {
  const api = useApi();
  const chatStore = useChatStore();

  return useMutation({
    mutationFn: (conversionUpdate: UpdateConversationDto) => {
      return api.conversations.patchConversation(chatId, conversionUpdate);
    },
    onSuccess: (updatedChat) => {
      chatStore.setChat(chatId, updatedChat);
    },
  });
};

export const useConfirmAiAction = (requestId: string) => {
  const api = useApi();
  const chatStore = useChatStore();
  const currentChatId = chatStore.currentChatId;

  return useMutation({
    mutationFn: (result: ChatUICallbackResultDto) => {
      return api.conversations.confirm(requestId, result);
    },
    onSuccess: () => {
      chatStore.updateMessage(currentChatId, getMessagePlaceholderId('ai'), { ui: undefined });
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
  const chatStore = useChatStore();
  const chatId = chatStore.currentChatId;

  return useMutation({
    mutationFn: async (rating: MessageDtoRatingEnum) => {
      if (chatId) {
        await api.conversations.rateMessage(chatId, messageId, { rating });
      }
    },
    onSuccess: (_, rating) => {
      chatStore.updateMessage(chatId, messageId, { rating });
    },
  });
};

export const useStateOfChat = () => {
  const currentChatId = useChatStore((s) => s.currentChatId);
  const chatDataMap = useChatStore((s) => s.chatDataMap);
  const chatData = chatDataMap.get(currentChatId);
  return chatData?.chat || { id: 0, configurationId: -1, createdAt: new Date() };
};

export const useStateOfSelectedChatId = () => useChatStore((s) => s.currentChatId);

export const useStateOfSelectedAssistantId = () => {
  const currentChatId = useChatStore((s) => s.currentChatId);
  const chatDataMap = useChatStore((s) => s.chatDataMap);
  const chatData = chatDataMap.get(currentChatId);
  return chatData?.chat.configurationId || -1;
};

export const useStateOfMessages = () => {
  const currentChatId = useChatStore((s) => s.currentChatId);
  const chatDataMap = useChatStore((s) => s.chatDataMap);
  const chatData = chatDataMap.get(currentChatId);
  return chatData?.messages || [];
};

export const useStateOfIsAiWriting = () => {
  const currentChatId = useChatStore((s) => s.currentChatId);
  const chatDataMap = useChatStore((s) => s.chatDataMap);
  const chatData = chatDataMap.get(currentChatId);
  return chatData?.isAiWriting || false;
};

export const useStateOfSelectedDocument = () => {
  const selectedDocument = useChatStore((state) => state.selectedDocument);
  const setSelectedDocument = useChatStore((state) => state.setSelectedDocument);

  return {
    selectedDocument,
    setSelectedDocument,
  };
};

export const useStateOfSelectedSource = () => {
  const selectedSource = useChatStore((state) => state.selectedSource);
  const setSelectedSource = useChatStore((state) => state.setSelectedSource);

  return {
    selectedSource,
    setSelectedSource,
  };
};

export const useStateOfReasoning = (chatId: number, messageId: number) => {
  const addReasoningStep = useChatStore((state) => state.addReasoningStep);
  const updateReasoningStep = useChatStore((state) => state.updateReasoningStep);
  const clearReasoning = useChatStore((state) => state.clearReasoning);

  return {
    addReasoningStep: (step: ReasoningStep) => addReasoningStep(chatId, messageId, step),
    updateReasoningStep: (stepId: string, update: Partial<ReasoningStep>) =>
      updateReasoningStep(chatId, messageId, stepId, update),
    clearReasoning: () => clearReasoning(chatId, messageId),
  };
};
