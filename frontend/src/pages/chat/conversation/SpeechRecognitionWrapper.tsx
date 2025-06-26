import { ActionIcon, Group, Menu } from '@mantine/core';
import { IconChevronDown, IconMicrophone } from '@tabler/icons-react';
import { SPEECH_RECOGNITION_LANGUAGES } from 'src/pages/utils';

interface SpeechRecognitionWrapperProps {
  isRecording: boolean;
  toggleSpeechRecognition: () => void;
  speechLanguage: string;
  setSpeechLanguage: (speechLanguage: string) => void;
}

export function SpeechRecognitionWrapper({
  isRecording,
  toggleSpeechRecognition,
  speechLanguage,
  setSpeechLanguage,
}: SpeechRecognitionWrapperProps) {
  return (
    <>
      <div className="flex" style={{ width: 'fit-content' }}>
        <Group wrap="nowrap" gap={0} align="stretch">
          <ActionIcon
            variant={isRecording ? 'filled' : 'outline'}
            size="lg"
            color={isRecording ? 'red' : 'black'}
            className={`border-gray-200 ${isRecording ? 'animate-pulse' : ''} rounded-r-none border-r-0`}
            onClick={toggleSpeechRecognition}
            title={isRecording ? 'Stop recording' : 'Start recording'}
            style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, width: '36px' }}
          >
            <IconMicrophone className="w-4" />
          </ActionIcon>
          <Menu shadow="md">
            <Menu.Target>
              <ActionIcon
                variant="outline"
                size="xs"
                className="rounded-l-none"
                disabled={isRecording}
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
              {SPEECH_RECOGNITION_LANGUAGES.map((language) => (
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
