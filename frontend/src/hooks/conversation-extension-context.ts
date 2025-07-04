import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from 'src/api';

type JSONValue = string | number | boolean | JSONObject | JSONArray | object | undefined;

export type JSONObject = {
  [key: string]: JSONValue;
};

class JSONArray extends Array<JSONValue> {}

export type ExtensionContext = {
  [extensionId: string]: JSONObject;
};

export const useExtensionContext = (conversationId: number) => {
  const api = useApi();

  const queryClient = useQueryClient();

  const queryKey = ['conversation', conversationId, 'extensionArguments'];

  const query = useQuery({
    queryKey,
    queryFn: () => api.conversations.getConversation(conversationId).then((data) => data?.extensionUserArguments || {}),
    enabled: !!conversationId,
  });

  const mutation = useMutation({
    mutationFn: (context: ExtensionContext) =>
      api.conversations.patchConversation(conversationId, { extensionUserArguments: context }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, () => data?.extensionUserArguments);
    },
  });

  return {
    context: query.data as ExtensionContext | undefined,
    error: query.error,
    isLoading: query.isLoading,
    isUpdating: mutation.isPending,
    updateContext: mutation.mutate,
    updateError: mutation.error,
  };
};
