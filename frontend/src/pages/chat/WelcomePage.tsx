import { Button, Text, Title } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { useProfile } from 'src/hooks';

export const WelcomePage = () => {
  const profile = useProfile();
  if (!profile) return <></>;
  return (
    <div className="flex h-screen items-center justify-center p-4">
      <div className="max-w-[500px] [&>*]:pb-2">
        <Title>Welcome to c4 GenAI Suite</Title>
        <Text c="dimmed">An AI chatbot with Model Context Provider (MCP) integration. Powered by Langchain.</Text>
        <br />
        {profile.isAdmin ? (
          <Button component="a" href="/admin/assistants?create=true" rightSection={<IconArrowRight className="w-4" />}>
            Setup an Assistent
          </Button>
        ) : (
          <Text c="dimmed">No Assistent is set up yet. Ask your Admin to set up an Assistent get started.</Text>
        )}
      </div>
    </div>
  );
};
