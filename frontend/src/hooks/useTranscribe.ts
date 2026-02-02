import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useApi } from 'src/api';
import { buildError } from 'src/lib';
import { texts } from 'src/texts';

interface UseTranscribeProps {
  extensionId: number;
  onTranscriptReceived: (transcript: string) => void;
  maxDurationMs?: number;
}

export type TranscribeState = 'idle' | 'recording' | 'transcribing' | 'error';

export function useTranscribe({ extensionId, onTranscriptReceived, maxDurationMs = 10 * 60 * 1000 }: UseTranscribeProps) {
  const [recordingState, setRecordingState] = useState<TranscribeState>('idle');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const mimeTypeRef = useRef<string>('audio/webm');

  const { transcription } = useApi();

  // Cleanup function
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    audioChunksRef.current = [];
  }, []);

  // Stop recording and transcribe
  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || recordingState !== 'recording') {
      return;
    }

    return new Promise<void>((resolve) => {
      const recorder = mediaRecorderRef.current!;

      recorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) {
          cleanup();
          toast.error(texts.chat.transcribe.noAudioRecorded);
          setRecordingState('idle');
          resolve();
          return;
        }

        // Store chunks before cleanup
        const audioChunks = [...audioChunksRef.current];

        // Stop timer and stream
        cleanup();

        setRecordingState('transcribing');

        try {
          const audioBlob = new Blob(audioChunks, { type: mimeTypeRef.current });

          if (audioBlob.size === 0) {
            toast.error(texts.chat.transcribe.noAudioRecorded);
            setRecordingState('error');
            resolve();
            return;
          }

          const audioFile = new File([audioBlob], 'recording.webm', { type: mimeTypeRef.current });
          const result = await transcription.transcribeAudio(extensionId, audioFile);

          if (!result.text || result.text.trim() === '') {
            toast.error(texts.chat.transcribe.transcriptionFailed);
            setRecordingState('error');
            resolve();
            return;
          }

          onTranscriptReceived(result.text);
          setRecordingState('idle');
        } catch (err) {
          const errorMessage = await buildError(texts.chat.transcribe.transcriptionFailed, err as Error);
          toast.error(errorMessage);
          setRecordingState('error');
        } finally {
          audioChunksRef.current = [];
        }

        resolve();
      };

      // Request any remaining data before stopping
      if (recorder.state === 'recording') {
        recorder.requestData();
        recorder.stop();
      }
    });
  }, [recordingState, transcription, extensionId, onTranscriptReceived, cleanup]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (recordingState !== 'idle' && recordingState !== 'error') {
      return;
    }

    setRecordingState('idle');

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        toast.error(texts.chat.transcribe.browserNotSupported);
        cleanup();
        return;
      }

      // OpenAI Whisper accepts webm format and most of the browsers use this type
      const mimeType = 'audio/webm';

      mimeTypeRef.current = mimeType;
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      audioChunksRef.current = [];

      // Collect audio data chunks as they become available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording errors
      mediaRecorder.onerror = (_event) => {
        toast.error(texts.chat.transcribe.recordingStartFailed);
        cleanup();
        setRecordingState('error');
      };

      // Start recording with 100ms timeslice for reliable audio capture
      mediaRecorder.start(100);
      setRecordingState('recording');
      startTimeRef.current = Date.now();

      // Start duration timer
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;

        // Auto-stop if max duration reached
        if (elapsed >= maxDurationMs) {
          void stopRecording();
          toast.info(texts.chat.transcribe.maxDurationReached);
        }
      }, 100);
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        toast.error(texts.chat.transcribe.microphonePermissionDenied);
      } else {
        toast.error(texts.chat.transcribe.recordingStartFailed);
      }
      setRecordingState('error');
      cleanup();
    }
  }, [recordingState, maxDurationMs, stopRecording, cleanup]);

  // Toggle recording
  const toggleRecording = useCallback(async () => {
    if (recordingState === 'idle' || recordingState === 'error') {
      await startRecording();
    } else if (recordingState === 'recording') {
      await stopRecording();
    }
  }, [recordingState, startRecording, stopRecording]);

  // Cleanup
  useEffect(() => {
    return () => {
      cleanup();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [cleanup]);

  return {
    isRecording: recordingState === 'recording',
    isTranscribing: recordingState === 'transcribing',
    toggleRecording,
  };
}
