import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useApi } from 'src/api';
import { buildError } from 'src/lib';
import { texts } from 'src/texts';

interface UseDictateProps {
  extensionId: number;
  onTranscriptReceived: (transcript: string) => void;
  maxDurationMs?: number;
}

export type DictateState = 'idle' | 'recording' | 'transcribing' | 'error';

export function isBrowserSupported(): boolean {
  return typeof window !== 'undefined' && window.MediaRecorder && !!navigator.mediaDevices?.getUserMedia;
}

export function useDictate({ extensionId, onTranscriptReceived, maxDurationMs = 10 * 60 * 1000 }: UseDictateProps) {
  const [state, setState] = useState<DictateState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState(() => isBrowserSupported());

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
    setRecordingDuration(0);
  }, []);

  // Stop recording and transcribe
  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || state !== 'recording') {
      return;
    }

    return new Promise<void>((resolve) => {
      const recorder = mediaRecorderRef.current!;

      recorder.onstop = async () => {
        console.log(`Recording stopped. Total chunks: ${audioChunksRef.current.length}`);

        // Check audio chunks BEFORE cleanup
        if (audioChunksRef.current.length === 0) {
          cleanup();
          toast.error(texts.chat.dictate.noAudioRecorded);
          setState('idle');
          resolve();
          return;
        }

        // Store chunks before cleanup
        const audioChunks = [...audioChunksRef.current];

        // Stop timer and stream
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        setState('transcribing');

        try {
          // Create audio blob from recorded chunks
          const audioBlob = new Blob(audioChunks, { type: mimeTypeRef.current });
          console.log(`Created audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`);

          // OpenAI needs the file extension to determine format
          const audioFile = new File([audioBlob], 'recording.webm', { type: mimeTypeRef.current });
          console.log(`Created audio file: ${audioFile.name}, size: ${audioFile.size} bytes, type: ${audioFile.type}`);

          // Call the transcription API
          const result = await transcription.transcribeAudio(extensionId, audioFile);

          if (result.text) {
            onTranscriptReceived(result.text);
            setState('idle');
          } else {
            throw new Error('No transcription text received');
          }
        } catch (err) {
          console.error('Transcription error:', err);
          const errorMessage = await buildError(texts.chat.dictate.transcriptionFailed, err as Error);
          toast.error(errorMessage);
          setError(errorMessage);
          setState('error');
        } finally {
          // Final cleanup
          audioChunksRef.current = [];
          setRecordingDuration(0);
        }

        resolve();
      };

      // Request any remaining data before stopping
      if (recorder.state === 'recording') {
        recorder.requestData();
        recorder.stop();
      }
    });
  }, [state, transcription, extensionId, onTranscriptReceived]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (state !== 'idle') {
      return;
    }

    setError(null);

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        toast.error(texts.chat.dictate.browserNotSupported);
        cleanup();
        return;
      }

      // OpenAI Whisper accepts webm format and most of the browsers use this type
      const mimeType = 'audio/webm';

      mimeTypeRef.current = mimeType;
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      audioChunksRef.current = [];

      // Collect audio data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording errors
      mediaRecorder.onerror = (_event) => {
        toast.error(texts.chat.dictate.recordingStartFailed);
        cleanup();
        setState('error');
      };

      // TODO1: check if 100ms is fine
      mediaRecorder.start(100);
      setState('recording');
      startTimeRef.current = Date.now();

      // Start duration timer
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setRecordingDuration(elapsed);

        // Auto-stop if max duration reached
        if (elapsed >= maxDurationMs) {
          void stopRecording();
          toast.info(texts.chat.dictate.maxDurationReached);
        }
      }, 100);
    } catch (err) {
      console.error('Error starting recording:', err);
      if (err instanceof Error && err.name === 'NotAllowedError') {
        toast.error(texts.chat.dictate.microphonePermissionDenied);
      } else {
        toast.error(texts.chat.dictate.recordingStartFailed);
      }
      setState('error');
      cleanup();
    }
  }, [state, maxDurationMs, stopRecording, cleanup]);

  // Toggle recording
  const toggleRecording = useCallback(async () => {
    if (state === 'idle') {
      await startRecording();
    } else if (state === 'recording') {
      await stopRecording();
    }
  }, [state, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [cleanup]);

  return {
    state,
    isRecording: state === 'recording',
    isTranscribing: state === 'transcribing',
    recordingDuration,
    error,
    isSupported,
    toggleRecording,
    startRecording,
    stopRecording,
  };
}
