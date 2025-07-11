import { createContext, useContext, useMemo } from 'react';
import { ProfileDto, useApi } from 'src/api';

export const ProfileContext = createContext<ProfileDto>(null!);

export function useProfile() {
  return useContext(ProfileContext);
}

export function useLogoutUrl() {
  const api = useApi();

  return useMemo(() => {
    return `${api.url}/api/auth/logout`;
  }, [api.url]);
}

export function useLoginUrl(provider: string) {
  const api = useApi();

  return useMemo(() => {
    return `${api.url}/api/auth/login/${provider}`;
  }, [api.url, provider]);
}
