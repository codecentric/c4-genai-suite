import { create } from 'zustand';
import { ConfigurationDto } from 'src/api';

type ListOfAssistantsState = {
  assistants: ConfigurationDto[];
  setAssistants: (assistants: ConfigurationDto[]) => void;
};

export const useListOfAssistantsStore = create<ListOfAssistantsState>()((set) => ({
  assistants: [],
  setAssistants: (assistants) => set({ assistants }),
}));
