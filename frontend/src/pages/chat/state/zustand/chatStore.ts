import { Observable, Subscription } from 'rxjs';
import { create } from 'zustand';
import { AppClient, ConversationDto, FileDto, MessageDto, StreamEventDto } from 'src/api';
import { ChatMessage } from '../types';

type ChatData = {
  messages: ChatMessage[];
  chat: ConversationDto;
  isAiWriting: boolean;
  activeStreamSubscription?: Subscription;
  streamingMessageId?: number;
  hasLoadedFromServer?: boolean; // Track if we've loaded initial data
};

type ChatState = {
  currentChatId: number;
  chatDataMap: Map<number, ChatData>;

  // Actions
  getCurrentChatData: () => ChatData | undefined;
  setMessages: (chatId: number, messages: ChatMessage[], preserveIfNewer?: boolean) => void;
  addMessage: (chatId: number, message: ChatMessage) => void;
  updateMessage: (
    chatId: number,
    messageId: number,
    messageUpdate: Partial<ChatMessage> | ((oldMessage: ChatMessage) => Partial<ChatMessage>),
  ) => void;
  updateLastMessage: (
    chatId: number,
    messageUpdate: Partial<ChatMessage> | ((oldMessage: ChatMessage) => Partial<ChatMessage>),
  ) => void;
  appendLastMessage: (chatId: number, text: string) => void;
  appendToStreamingMessage: (chatId: number, text: string) => void;
  setChat: (chatId: number, chat: ConversationDto) => void;
  setIsAiWriting: (chatId: number, isAiWriting: boolean) => void;
  setStreamingMessageId: (chatId: number, messageId?: number) => void;
  setActiveStreamSubscription: (chatId: number, subscription?: Subscription) => void;
  cancelActiveStream: (chatId: number) => void;
  cancelAllActiveStreams: () => void;
  switchToChat: (chatId: number) => void;
  initializeChatIfNeeded: (chatId: number) => void;
  getStream: (
    chatId: number,
    input: string,
    files: FileDto[] | undefined,
    api: AppClient,
    editMessageId: number | undefined,
  ) => Observable<StreamEventDto>;
  hasActiveStream: (chatId: number) => boolean;
};

const createEmptyChatData = (chatId: number): ChatData => ({
  messages: [],
  chat: { id: chatId, configurationId: -1, createdAt: new Date() },
  isAiWriting: false,
  activeStreamSubscription: undefined,
  streamingMessageId: undefined,
  hasLoadedFromServer: false,
});

export const useChatStore = create<ChatState>()((set, get) => {
  return {
    currentChatId: 0,
    chatDataMap: new Map(),

    getCurrentChatData: () => {
      const { currentChatId, chatDataMap } = get();
      return chatDataMap.get(currentChatId);
    },

    initializeChatIfNeeded: (chatId) => {
      set((state) => {
        if (!state.chatDataMap.has(chatId)) {
          const newMap = new Map(state.chatDataMap);
          newMap.set(chatId, createEmptyChatData(chatId));
          return { chatDataMap: newMap };
        }
        return state;
      });
    },

    switchToChat: (chatId) => {
      const { initializeChatIfNeeded } = get();
      initializeChatIfNeeded(chatId);
      set({ currentChatId: chatId });
    },

    getStream: (chatId, query, files, api, editMessageId) => {
      return api.stream.streamPrompt(chatId, { query, files }, editMessageId);
    },

    hasActiveStream: (chatId) => {
      const state = get();
      const chatData = state.chatDataMap.get(chatId);
      return !!(chatData?.activeStreamSubscription && !chatData.activeStreamSubscription.closed);
    },

    setStreamingMessageId: (chatId, messageId) =>
      set((state) => {
        const chatData = state.chatDataMap.get(chatId);
        if (!chatData) return state;

        const newMap = new Map(state.chatDataMap);
        newMap.set(chatId, { ...chatData, streamingMessageId: messageId });
        return { chatDataMap: newMap };
      }),

    appendToStreamingMessage: (chatId, text) =>
      set((state) => {
        const chatData = state.chatDataMap.get(chatId);
        if (!chatData || !chatData.streamingMessageId) return state;

        const messages = [...chatData.messages];
        const messageIndex = messages.findIndex((msg) => msg.id === chatData.streamingMessageId);

        if (messageIndex === -1) return state;

        const message = messages[messageIndex];
        if (message && message.content[0] && message.content[0].type === 'text') {
          const newText = message.content[0].text + text;
          const newMsg: MessageDto = {
            ...message,
            content: [{ type: 'text', text: newText }],
          };
          messages[messageIndex] = newMsg;
        }

        const newMap = new Map(state.chatDataMap);
        newMap.set(chatId, { ...chatData, messages });
        return { chatDataMap: newMap };
      }),

    appendLastMessage: (chatId, text) =>
      set((state) => {
        const chatData = state.chatDataMap.get(chatId);
        if (!chatData) return state;

        const messages = [...chatData.messages];
        const lastMsg = messages.pop();

        if (lastMsg && lastMsg.content[0]) {
          const contentItem = lastMsg.content[0];
          if (contentItem.type === 'text') {
            const newText = contentItem.text + text;
            const newMsg: MessageDto = { ...lastMsg, content: [{ type: 'text', text: newText }] };
            messages.push(newMsg);
          } else {
            messages.push(lastMsg);
          }
        }

        const newMap = new Map(state.chatDataMap);
        newMap.set(chatId, { ...chatData, messages });
        return { chatDataMap: newMap };
      }),

    updateLastMessage: (chatId, messageUpdate) =>
      set((state) => {
        const chatData = state.chatDataMap.get(chatId);
        if (!chatData) return state;

        const messages = [...chatData.messages];
        const lastMsg = messages.pop();

        if (!lastMsg) return state;

        const messageUpdates = typeof messageUpdate === 'function' ? messageUpdate(lastMsg) : messageUpdate;
        const newMsg: MessageDto = { ...lastMsg, ...messageUpdates };
        messages.push(newMsg);

        const newMap = new Map(state.chatDataMap);
        newMap.set(chatId, { ...chatData, messages });
        return { chatDataMap: newMap };
      }),

    updateMessage: (chatId, messageId, messageUpdate) =>
      set((state) => {
        const chatData = state.chatDataMap.get(chatId);
        if (!chatData) return state;

        const selectedMsg = chatData.messages.find((msg) => msg.id === messageId);
        if (!selectedMsg) return state;

        const messageUpdates = typeof messageUpdate === 'function' ? messageUpdate(selectedMsg) : messageUpdate;
        const newMsg: MessageDto = { ...selectedMsg, ...messageUpdates };
        const messages = chatData.messages.map((msg) => (msg.id === messageId ? newMsg : msg));

        const newMap = new Map(state.chatDataMap);
        newMap.set(chatId, { ...chatData, messages });
        return { chatDataMap: newMap };
      }),

    addMessage: (chatId, message) =>
      set((state) => {
        const chatData = state.chatDataMap.get(chatId);
        if (!chatData) return state;

        const messages = [...chatData.messages, message];
        const newMap = new Map(state.chatDataMap);
        newMap.set(chatId, { ...chatData, messages });
        return { chatDataMap: newMap };
      }),

    setMessages: (chatId, messages, preserveIfNewer = false) =>
      set((state) => {
        const chatData = state.chatDataMap.get(chatId) || createEmptyChatData(chatId);

        // If preserveIfNewer is true and we already have messages (from streaming), don't overwrite
        if (preserveIfNewer && chatData.messages.length > 0 && chatData.hasLoadedFromServer) {
          return state;
        }

        const newMap = new Map(state.chatDataMap);
        newMap.set(chatId, {
          ...chatData,
          messages,
          isAiWriting: chatData.isAiWriting, // Preserve streaming state
          hasLoadedFromServer: true,
        });
        return { chatDataMap: newMap };
      }),

    setChat: (chatId, chat) =>
      set((state) => {
        const chatData = state.chatDataMap.get(chatId) || createEmptyChatData(chatId);
        const newMap = new Map(state.chatDataMap);
        newMap.set(chatId, { ...chatData, chat });
        return { chatDataMap: newMap };
      }),

    setIsAiWriting: (chatId, isAiWriting) =>
      set((state) => {
        const chatData = state.chatDataMap.get(chatId);
        if (!chatData) return state;

        const newMap = new Map(state.chatDataMap);
        newMap.set(chatId, { ...chatData, isAiWriting });
        return { chatDataMap: newMap };
      }),

    setActiveStreamSubscription: (chatId, subscription) =>
      set((state) => {
        const chatData = state.chatDataMap.get(chatId);
        if (!chatData) return state;

        const newMap = new Map(state.chatDataMap);
        newMap.set(chatId, { ...chatData, activeStreamSubscription: subscription });
        return { chatDataMap: newMap };
      }),

    cancelActiveStream: (chatId) =>
      set((state) => {
        const chatData = state.chatDataMap.get(chatId);
        if (!chatData?.activeStreamSubscription) return state;

        chatData.activeStreamSubscription.unsubscribe();
        const newMap = new Map(state.chatDataMap);
        newMap.set(chatId, {
          ...chatData,
          activeStreamSubscription: undefined,
          isAiWriting: false,
          streamingMessageId: undefined,
        });
        return { chatDataMap: newMap };
      }),

    cancelAllActiveStreams: () =>
      set((state) => {
        const newMap = new Map(state.chatDataMap);

        state.chatDataMap.forEach((chatData, chatId) => {
          if (chatData.activeStreamSubscription) {
            chatData.activeStreamSubscription.unsubscribe();
            newMap.set(chatId, {
              ...chatData,
              activeStreamSubscription: undefined,
              isAiWriting: false,
              streamingMessageId: undefined,
            });
          }
        });

        return { chatDataMap: newMap };
      }),
  };
});
