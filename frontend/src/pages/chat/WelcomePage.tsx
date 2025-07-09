import { Button, Text, Title } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { useProfile } from 'src/hooks';
import { texts } from 'src/texts';
import { isMobile } from '../utils';

export const WelcomePage = () => {
  const { isAdmin } = useProfile();
  return (
    <div className="flex h-screen items-center justify-center p-4">
      <div className="max-w-[500px] [&>*]:pb-2">
        <Title>{texts.welcome.title}</Title>
        <Text c="dimmed">{texts.welcome.subtitle}</Text>
        <br />
        {(() => {
          if (!isAdmin) return <Text c="dimmed">{texts.welcome.noAssistantIsSetUpYet}</Text>;
          if (isMobile()) return <Text c="dimmed">{texts.welcome.setupAnAssistantOnDesktop}</Text>;
          return (
            <Button component="a" href="/admin/assistants?create" rightSection={<IconArrowRight className="w-4" />}>
              {texts.welcome.setupAnAssistant}
            </Button>
          );
        })()}
      </div>
    </div>
  );
};
