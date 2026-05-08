import { ActionIcon, Group, Menu } from '@mantine/core';
import { IconChevronDown, IconMicrophone } from '@tabler/icons-react';
import { LocalTranscribeState } from 'src/hooks/useLocalTranscribe';
import { texts } from 'src/texts';

/** Props for the local transcription microphone button with language selector. */
interface LocalTranscribeButtonProps {
  state: LocalTranscribeState;
  isRecording: boolean;
  isTranscribing: boolean;
  isDownloading: boolean;
  onToggle: () => void;
  language: string;
  onLanguageChange: (language: string) => void;
  languages: string[];
}

export function LocalTranscribeButton({
  state,
  isRecording,
  isTranscribing,
  isDownloading,
  onToggle,
  language,
  onLanguageChange,
  languages,
}: LocalTranscribeButtonProps) {
  const getButtonLabel = () => {
    if (isTranscribing) return texts.chat.localTranscribe.transcribing;
    if (isRecording) return texts.chat.localTranscribe.stopRecording;
    if (isDownloading) return texts.chat.localTranscribe.downloadingModel;
    if (state === 'loading') return texts.chat.localTranscribe.loadingModel;
    return texts.chat.localTranscribe.startRecording;
  };

  const isLoading = state === 'loading';
  const isBusy = isRecording || isTranscribing || isDownloading || isLoading;

  return (
    <div className="flex" style={{ width: 'fit-content' }}>
      <Group wrap="nowrap" gap={0} align="stretch">
        <ActionIcon
          variant={isRecording ? 'filled' : 'outline'}
          size="lg"
          color={isRecording ? 'red' : 'black'}
          className={`border-gray-200 ${isRecording ? 'animate-pulse' : ''} rounded-r-none border-r-0`}
          onClick={onToggle}
          disabled={isDownloading || isTranscribing || isLoading}
          loading={isTranscribing || isLoading}
          data-tooltip-id="default"
          data-tooltip-content={getButtonLabel()}
          aria-label={getButtonLabel()}
          style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, width: '36px' }}
        >
          <IconMicrophone className="w-4" />
        </ActionIcon>
        <Menu shadow="md" withInitialFocusPlaceholder={false}>
          <Menu.Target>
            <ActionIcon
              variant="outline"
              size="xs"
              className="rounded-l-none"
              disabled={isBusy}
              aria-label={texts.accessibility.selectLanguage}
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
          <Menu.Dropdown aria-label={texts.accessibility.selectLanguage}>
            {languages.map((lang) => (
              <Menu.Item
                key={lang}
                onClick={() => onLanguageChange(lang)}
                color={language === lang ? 'black' : ''}
                fw={language === lang ? 'bold' : ''}
              >
                {lang}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </Group>
    </div>
  );
}
