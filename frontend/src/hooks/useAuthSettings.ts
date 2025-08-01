import { useQuery } from '@tanstack/react-query';
import { useApi } from 'src/api';

export const useAuthSettings = () => {
  const api = useApi();

  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.auth.getAuthSettings(),
  });
};
