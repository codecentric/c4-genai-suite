import { Observable } from 'rxjs';
import { create } from 'zustand';
import { AppClient, ConversationDto, FileDto, MessageDto, StreamEventDto } from 'src/api';
import { ChatMessage } from '../types';

type ChatState = {
  messages: ChatMessage[];
  chat: ConversationDto;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (
    messageId: number,
    messageUpdate: Partial<ChatMessage> | ((oldMessage: ChatMessage) => Partial<ChatMessage>),
  ) => void;
  updateLastMessage: (messageUpdate: Partial<ChatMessage> | ((oldMessage: ChatMessage) => Partial<ChatMessage>)) => void;
  appendLastMessage: (text: string) => void;
  setChat: (chat: ConversationDto) => void;
  isAiWriting?: boolean;
  setIsAiWriting: (isAiWriting: boolean) => void;
  getStream: (
    chatId: number,
    input: string,
    files: FileDto[] | undefined,
    api: AppClient,
    editMessageId: number | undefined,
  ) => Observable<StreamEventDto>;
};

/**
 * Contains everything that is part of the currently open conversion.
 **/
export const useChatStore = create<ChatState>()((set) => {
  return {
    chat: { id: 0, configurationId: -1, createdAt: new Date() },
    messages: [],
    getStream: (chatId, query, files, api, editMessageId) => api.stream.streamPrompt(chatId, { query, files }, editMessageId),
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
    setMessages: (messages) => set({ messages, isAiWriting: false }),
    setChat: (chat) => set({ chat }),
    setIsAiWriting: (isAiWriting) => set({ isAiWriting }),
  };
});
