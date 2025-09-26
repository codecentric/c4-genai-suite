import { create } from 'zustand/index';
import { FileDto } from 'src/api';

interface UserFilesState {
  userFiles: FileDto[];
  add: (file: FileDto) => void;
  remove: (file: FileDto) => void;
  clear: () => void;
}

export const useUserFilesStore = create<UserFilesState>((set) => ({
  userFiles: [],
  add: (file: FileDto) => set((state) => ({ userFiles: [...state.userFiles.filter((x) => x.id !== file.id), file] })),
  remove: (file: FileDto) => set((state) => ({ userFiles: state.userFiles.filter((x) => x.id !== file.id) })),
  clear: () => set(() => ({ userFiles: [] })),
}));
