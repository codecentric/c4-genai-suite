import { useQuery } from '@tanstack/react-query';
import { useApi } from 'src/api';
import { ChatPage } from './ChatPage';
import { WelcomePage } from './WelcomePage';

export const ChatOrWelcomePage = () => {
  const api = useApi();
  const { data: loadedConfigurations } = useQuery({
    queryKey: ['enabled-configurations'],
    queryFn: () => api.extensions.getConfigurations(true),
  });
  if (!loadedConfigurations) return <></>;
  return loadedConfigurations.items.length > 0 ? <ChatPage /> : <WelcomePage />;
};
