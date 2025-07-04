import { useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { toast } from 'react-toastify';
import { texts } from 'src/texts';

interface UseSpeechRecognitionToggleProps {
  speechLanguage: string;
  onTranscriptUpdate: (transcript: string) => void;
}

export function useSpeechRecognitionToggle({ speechLanguage, onTranscriptUpdate }: UseSpeechRecognitionToggleProps) {
  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition, isMicrophoneAvailable } =
    useSpeechRecognition();

  useEffect(() => {
    if (listening && transcript) {
      onTranscriptUpdate(transcript);
    }
  }, [listening, transcript, onTranscriptUpdate]);

  const toggleSpeechRecognition = async () => {
    if (!browserSupportsSpeechRecognition) {
      toast.error(texts.chat.speechRecognition.browserNotSupported);
      return;
    }

    if (!isMicrophoneAvailable) {
      toast.error(texts.chat.speechRecognition.microphoneNotAvailable);
      return;
    }

    try {
      if (listening) {
        await SpeechRecognition.stopListening();
        resetTranscript();
      } else {
        const permissionResult = await navigator.mediaDevices.getUserMedia({ audio: true });

        await SpeechRecognition.startListening({
          continuous: true,
          language: speechLanguage,
        });

        if (permissionResult && permissionResult.getTracks) {
          permissionResult.getTracks().forEach((track) => track.stop());
        }
      }
    } catch (err) {
      console.error('Speech recognition error:', err);
      toast.error(texts.chat.speechRecognition.speechRecognitionFailed);
    }
  };
  return { toggleSpeechRecognition, listening };
}
