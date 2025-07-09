import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { ResponseError, useApi } from 'src/api';

const useIsLoggedOut = () => {
  const api = useApi();
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      try {
        const profile = await api.auth.getProfile();
        return { isLoggedOut: false, profile };
      } catch (error) {
        if (error instanceof ResponseError && error.response?.status === 401) {
          return { isLoggedOut: true, profile: null };
        }
        throw error;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
};
export function RouteWhenLoggedOut({ children }: React.PropsWithChildren) {
  const { isPending, data } = useIsLoggedOut();

  if (isPending) return <></>;

  if (data?.isLoggedOut) {
    return <>{children}</>;
  }
  return <Navigate to="/chat" />;
}
