import { Button, Text, Title } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { useProfile } from 'src/hooks';
import { texts } from 'src/texts';

export const WelcomePage = () => {
  const profile = useProfile();
  if (!profile) return <></>;
  return (
    <div className="flex h-screen items-center justify-center p-4">
      <div className="max-w-[500px] [&>*]:pb-2">
        <Title>{texts.welcome.title}</Title>
        <Text c="dimmed">{texts.welcome.subtitle}</Text>
        <br />
        {profile.isAdmin ? (
          <Button component="a" href="/admin/assistants?create=true" rightSection={<IconArrowRight className="w-4" />}>
            {texts.welcome.setupAnAssistent}
          </Button>
        ) : (
          <Text c="dimmed">{texts.welcome.noAssistenIsSetUpYet}</Text>
        )}
      </div>
    </div>
  );
};
