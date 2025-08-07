import { create } from 'zustand/index';
import { FileDto } from 'src/api';

export type VirtualFile = FileDto & { local?: boolean };

interface UserFilesState {
  userFiles: VirtualFile[];
  add: (file: VirtualFile) => void;
  remove: (file: VirtualFile) => void;
  toggle: (file: VirtualFile) => void;
  clear: () => void;
}

export const useUserFilesStore = create<UserFilesState>((set) => ({
  userFiles: [],
  add: (file: FileDto) => set((state) => ({ userFiles: [...state.userFiles, { ...file, local: true }] })),
  remove: (file: FileDto) => set((state) => ({ userFiles: state.userFiles.filter((x) => x.id !== file.id) })),
  toggle: (file: FileDto) =>
    set((state) => {
      const exists = state.userFiles.find((x) => x.id === file.id);
      if (exists) {
        return { userFiles: state.userFiles.filter((x) => x.id !== file.id) };
      } else {
        return { userFiles: [...state.userFiles, { ...file, local: true }] };
      }
    }),
  clear: () => set(() => ({ userFiles: [] })),
}));
