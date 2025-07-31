import { useQuery } from '@tanstack/react-query';
import { useApi } from 'src/api';
import { useUserFilesStore, VirtualFile } from 'src/pages/chat/state/zustand/userFilesStore';

export const useDocumentContent = (conversationId: number, messageId: number, documentUri: string) => {
  const { conversations } = useApi();
  return useQuery({
    queryFn: () => conversations.getDocumentChunks(conversationId, messageId, documentUri),
    queryKey: ['files', 'document-content', { messageId }, { documentUri }],
    enabled: !!documentUri,
  });
};

export const useDocument = (conversationId: number, messageId: number, documentUri: string) => {
  const { conversations } = useApi();

  return useQuery({
    queryFn: () => conversations.getDocument(conversationId, messageId, documentUri),
    queryKey: ['files', 'document', { messageId }, { documentUri }],
    enabled: !!documentUri,
  });
};

export const useConversationFiles = (conversationId: number) => {
  const api = useApi();
  const { userFiles, ...userFilesFunctions } = useUserFilesStore();

  const { data: conversationFiles, refetch } = useQuery({
    queryKey: ['files', 'conversation-files', { conversationId }],
    queryFn: () => api.files.getUserFiles(undefined, undefined, undefined, conversationId),
    select: (data) => data.items,
  });

  return {
    data: [...userFiles, ...(conversationFiles || [])] as VirtualFile[],
    ...userFilesFunctions,
    refetch,
  };
};
