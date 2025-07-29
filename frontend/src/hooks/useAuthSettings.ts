import { useApi } from 'src/api';
import { useQuery } from '@tanstack/react-query';

export const useAuthSettings = () => {
  const api = useApi();

  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.auth.getAuthSettings(),
  });
};
