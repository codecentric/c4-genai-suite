import { create } from 'zustand';
import { ConversationDto } from 'src/api';

type ListOfChatsState = {
  chats: ConversationDto[];
  setChats: (chats: ConversationDto[]) => void;
  upsertChat: (chat: ConversationDto) => void;
  removeChat: (id: number) => void;
  refetch: VoidFunction;
  setRefetchFn: (refetchFn: VoidFunction) => void;
};

export const useListOfChatsStore = create<ListOfChatsState>()((set) => ({
  chats: [],
  setChats: (chats) => set({ chats }),
  upsertChat: (chat) =>
    set(({ chats }) => {
      const exists = chats.some((existingChat) => existingChat.id === chat.id);
      if (!exists) return { chats: [...chats, chat] };
      return {
        chats: chats.map((existingChat) => (existingChat.id === chat.id ? chat : existingChat)),
      };
    }),
  removeChat: (id) => set((state) => ({ chats: state.chats.filter((x) => x.id !== id) })),
  refetch: () => {},
  setRefetchFn: (refetch) => set({ refetch }),
}));
