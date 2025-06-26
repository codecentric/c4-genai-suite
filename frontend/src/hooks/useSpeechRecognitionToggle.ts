import { useEffect, useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { toast } from 'react-toastify';
import { texts } from 'src/texts';

interface UseSpeechRecognitionToggleProps {
  speechLanguage: string;
  onTranscriptUpdate: (transcript: string) => void;
}

export function useSpeechRecognitionToggle({ speechLanguage, onTranscriptUpdate }: UseSpeechRecognitionToggleProps) {
  const [isRecording, setIsRecording] = useState(false);
  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition, isMicrophoneAvailable } =
    useSpeechRecognition();

  useEffect(() => {
    if (listening && transcript) {
      onTranscriptUpdate(transcript);
    }
  }, [listening, transcript, onTranscriptUpdate]);

  const toggleSpeechRecognition = async () => {
    if (!browserSupportsSpeechRecognition) {
      setIsRecording(false);
      toast.error(texts.chat.speechRecognition.browserNotSupported);
      return;
    }

    if (!isMicrophoneAvailable) {
      setIsRecording(false);
      toast.error(texts.chat.speechRecognition.microphoneNotAvailable);
      return;
    }

    try {
      if (listening) {
        await SpeechRecognition.stopListening();
        resetTranscript();
        setIsRecording(false);
      } else {
        const permissionResult = await navigator.mediaDevices.getUserMedia({ audio: true });

        await SpeechRecognition.startListening({
          continuous: true,
          language: speechLanguage,
        });
        setIsRecording(true);

        if (permissionResult && permissionResult.getTracks) {
          permissionResult.getTracks().forEach((track) => track.stop());
        }
      }
    } catch (err) {
      console.error('Speech recognition error:', err);
      toast.error(texts.chat.speechRecognition.speechRecognitionFailed);
      setIsRecording(false);
    }
  };
  return { isRecording, toggleSpeechRecognition };
}
