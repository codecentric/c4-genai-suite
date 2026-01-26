import { ActionIcon } from '@mantine/core';
import { IconMicrophone } from '@tabler/icons-react';
import { texts } from 'src/texts';

interface DictateButtonProps {
  isRecording: boolean;
  isTranscribing: boolean;
  onToggle: () => void;
}

export function DictateButton({ isRecording, isTranscribing, onToggle }: DictateButtonProps) {
  const getButtonText = () => {
    if (isTranscribing) {
      return texts.chat.dictate.transcribing;
    }
    if (isRecording) {
      return texts.chat.dictate.stopRecording;
    }
    return texts.chat.dictate.startRecording;
  };

  const getButtonColor = () => {
    if (isRecording) return 'red';
    return 'black';
  };

  return (
    <ActionIcon
      variant={isRecording ? 'filled' : 'outline'}
      size="lg"
      color={getButtonColor()}
      className={`border-gray-200 ${isRecording ? 'animate-pulse' : ''}`}
      onClick={onToggle}
      title={getButtonText()}
      disabled={isTranscribing}
      loading={isTranscribing}
      aria-label={getButtonText()}
    >
      <IconMicrophone className="w-4" />
    </ActionIcon>
  );
}
