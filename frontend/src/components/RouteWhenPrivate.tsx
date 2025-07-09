import { useQuery } from '@tanstack/react-query';
import { ProfileContext } from 'src/hooks';
import { ResponseError, useApi } from '../api';

export function RouteWhenPrivate(props: React.PropsWithChildren) {
  const { children } = props;

  const api = useApi();
  const { data, isError, error } = useQuery({
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
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry on 401 errors
      if (error instanceof ResponseError && error.response?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // If there's a 401 error or user is logged out, redirect to login
  if (data?.isLoggedOut || (isError && error instanceof ResponseError && error.response?.status === 401)) {
    window.location.href = '/login';
    return null;
  }

  if (!data?.profile) {
    return null;
  }

  return <ProfileContext.Provider value={data.profile}>{children}</ProfileContext.Provider>;
}
