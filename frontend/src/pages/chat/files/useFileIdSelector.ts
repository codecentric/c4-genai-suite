import { FileDto } from 'src/api';
import { useConversationFiles } from 'src/hooks/api/files';

export const useFileIdSelector = (conversationId: number) => {
  const { data, add, remove, toggle } = useConversationFiles(conversationId);

  return {
    selectedIDs: data.map((x) => x.id),
    selectId: (file: FileDto) => add(file),
    deselectId: (file: FileDto) => remove(file),
    toggleIdSelection: (file: FileDto) => toggle(file),
  };
};
