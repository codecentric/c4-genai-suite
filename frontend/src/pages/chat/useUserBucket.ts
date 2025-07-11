import { useQuery } from '@tanstack/react-query';
import { BucketDtoTypeEnum, useApi } from 'src/api';

export function useUserBucket(assistantId: number) {
  const api = useApi();

  const query = useQuery({
    queryKey: ['userBucket', assistantId],
    queryFn: async () => {
      const response = await api.extensions.getBucketAvailability(assistantId, BucketDtoTypeEnum.User);
      return response.extensions?.[0];
    },
    enabled: !!assistantId,
  });

  const userBucket = query.isSuccess ? query.data : undefined;
  const { data: _, ...rest } = query;

  return { userBucket, ...rest };
}
