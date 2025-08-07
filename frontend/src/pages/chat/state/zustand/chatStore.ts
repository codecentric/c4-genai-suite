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
  hasLoadedFromServer?: boolean;
};

type ChatState = {
  currentChatId: number;
  chatDataMap: Map<number, ChatData>;

  setMessages: (chatId: number, messages: ChatMessage[], preserveIfNewer?: boolean) => void;
  addMessage: (chatId: number, message: ChatMessage) => void;
  updateMessage: (
    chatId: number,
    messageId: number,
    messageUpdate: Partial<ChatMessage> | ((oldMessage: ChatMessage) => Partial<ChatMessage>),
  ) => void;
  appendToStreamingMessage: (chatId: number, text: string) => void;
  setChat: (chatId: number, chat: ConversationDto) => void;
  setIsAiWriting: (chatId: number, isAiWriting: boolean) => void;
  setStreamingMessageId: (chatId: number, messageId?: number) => void;
  setActiveStreamSubscription: (chatId: number, subscription?: Subscription) => void;
  cancelActiveStream: (chatId: number) => void;
  switchToChat: (chatId: number) => void;
  initializeChatIfNeeded: (chatId: number) => void;
  getStream: (
    chatId: number,
    input: string,
    files: FileDto[] | undefined,
    api: AppClient,
    editMessageId: number | undefined,
  ) => Observable<StreamEventDto>;
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
          messages[messageIndex] = {
            ...message,
            content: [{ type: 'text', text: newText }],
          };
        }

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

        if (preserveIfNewer && chatData.messages.length > 0 && chatData.hasLoadedFromServer) {
          return state;
        }

        const newMap = new Map(state.chatDataMap);
        newMap.set(chatId, {
          ...chatData,
          messages,
          isAiWriting: chatData.isAiWriting,
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
  };
});
