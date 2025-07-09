import { ActionIcon, Group, Menu } from '@mantine/core';
import { IconChevronDown, IconMicrophone } from '@tabler/icons-react';
import { texts } from 'src/texts';

export interface Language {
  name: string;
  code: string;
}

interface SpeechRecognitionWrapperProps {
  listening: boolean;
  toggleSpeechRecognition: () => void;
  speechLanguage: string;
  setSpeechLanguage: (speechLanguage: string) => void;
  languages: Language[];
}

export function SpeechRecognitionButton({
  listening,
  toggleSpeechRecognition,
  speechLanguage,
  setSpeechLanguage,
  languages,
}: SpeechRecognitionWrapperProps) {
  const buttonText = listening ? texts.chat.speechRecognition.stopMicrophone : texts.chat.speechRecognition.useMicrophone;
  const toolTipText = `${buttonText} (${speechLanguage})`;

  return (
    <>
      <div className="flex" style={{ width: 'fit-content' }}>
        <Group wrap="nowrap" gap={0} align="stretch">
          <ActionIcon
            variant={listening ? 'filled' : 'outline'}
            size="lg"
            color={listening ? 'red' : 'black'}
            className={`border-gray-200 ${listening ? 'animate-pulse' : ''} rounded-r-none border-r-0`}
            onClick={toggleSpeechRecognition}
            title={toolTipText}
            style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, width: '36px' }}
            aria-label={toolTipText}
          >
            <IconMicrophone className="w-4" />
          </ActionIcon>
          <Menu shadow="md">
            <Menu.Target>
              <ActionIcon
                variant="outline"
                size="xs"
                className="rounded-l-none"
                disabled={listening}
                style={{
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  paddingLeft: 0,
                  paddingRight: 0,
                  width: '12px',
                  height: 'auto',
                }}
              >
                <IconChevronDown className="w-3" />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {languages.map((language) => (
                <Menu.Item
                  key={language.code}
                  onClick={() => setSpeechLanguage(language.code)}
                  color={speechLanguage === language.code ? 'black' : ''}
                  fw={speechLanguage === language.code ? 'bold' : ''}
                >
                  {language.name}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </div>
    </>
  );
}
