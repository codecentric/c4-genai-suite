import { useQuery } from '@tanstack/react-query';
import { useApi } from 'src/api';

export const useDocumentContent = (conversationId: number, messageId: number, documentUri: string) => {
  const api = useApi();
  return useQuery({
    queryFn: () => api.conversations.getDocumentChunks(conversationId, messageId, documentUri),
    queryKey: ['files', 'document-content', { messageId }, { documentUri }],
    enabled: !!documentUri,
  });
};

export const useConversationFiles = (conversationId: number) => {
  const api = useApi();

  return useQuery({
    queryKey: ['files', 'conversation-files', { conversationId }],
    queryFn: () => api.files.getUserFiles(undefined, undefined, undefined, conversationId),
    select: (data) => data.items,
  });
};
