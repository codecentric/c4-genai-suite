import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { resampleToMono16kHz } from 'src/lib/audio-utils';
import { texts } from 'src/texts';

export type LocalTranscribeState = 'idle' | 'downloading' | 'loading' | 'recording' | 'transcribing' | 'error';

export interface DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UseLocalTranscribeProps {
  language: string;
  onTranscriptReceived: (transcript: string) => void;
  maxDurationMs?: number;
}

export function useLocalTranscribe({ language, onTranscriptReceived, maxDurationMs = 2 * 60 * 1000 }: UseLocalTranscribeProps) {
  const [state, setState] = useState<LocalTranscribeState>('idle');
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const modelLoadedRef = useRef<boolean>(false);
  const pendingRecordRef = useRef<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const onTranscriptReceivedRef = useRef(onTranscriptReceived);
  const languageRef = useRef(language);
  const stateRef = useRef<LocalTranscribeState>(state);
  const maxDurationMsRef = useRef(maxDurationMs);

  // Keep refs in sync
  useEffect(() => {
    onTranscriptReceivedRef.current = onTranscriptReceived;
  }, [onTranscriptReceived]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    maxDurationMsRef.current = maxDurationMs;
  }, [maxDurationMs]);

  // Cleanup function for stream, timer, and audio chunks
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

  // Internal function to actually begin recording (after model is confirmed loaded)
  // Uses refs exclusively so it has stable identity
  const beginRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = () => {
        toast.error(texts.chat.localTranscribe.recordingStartFailed);
        cleanup();
        setState('error');
      };

      mediaRecorder.start(100);
      setState('recording');
      startTimeRef.current = Date.now();

      // Start duration timer for auto-stop
      timerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        if (elapsed >= maxDurationMsRef.current) {
          // Auto-stop: stop the recorder directly
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.requestData();
            mediaRecorderRef.current.stop();
          }
          toast.info(texts.chat.localTranscribe.maxDurationReached);
        }
      }, 100);
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        toast.error(texts.chat.localTranscribe.microphonePermissionDenied);
      } else {
        toast.error(texts.chat.localTranscribe.recordingStartFailed);
      }
      setState('error');
      cleanup();
    }
  }, [cleanup]);

  // Store beginRecording in a ref so handleWorkerMessage doesn't depend on it
  const beginRecordingRef = useRef(beginRecording);
  useEffect(() => {
    beginRecordingRef.current = beginRecording;
  }, [beginRecording]);

  // Worker message handler -- uses refs exclusively for stable identity
  const handleWorkerMessage = useCallback((event: MessageEvent) => {
    const data = event.data as Record<string, unknown>;

    switch (data.status) {
      case 'download':
      case 'initiate':
        // If we were in 'loading' state (mount pre-load), transition to 'downloading'
        // to indicate a fresh download is happening (not cached)
        if (stateRef.current === 'loading') {
          setState('downloading');
        }
        break;

      case 'progress':
        // Per-file progress -- if we're loading, this means download is in progress
        if (stateRef.current === 'loading') {
          setState('downloading');
        }
        break;

      case 'progress_total':
        // Aggregate download progress (D-08)
        if (stateRef.current === 'downloading' || stateRef.current === 'loading') {
          if (stateRef.current === 'loading') {
            setState('downloading');
          }
          setDownloadProgress({
            loaded: data.loaded as number,
            total: data.total as number,
            percentage: data.progress as number,
          });
        }
        break;

      case 'done':
        // Per-file download complete -- no state change needed
        break;

      case 'ready':
        modelLoadedRef.current = true;
        setDownloadProgress(null);

        if (pendingRecordRef.current) {
          // User clicked record during download -- auto-start recording (D-04)
          pendingRecordRef.current = false;
          void beginRecordingRef.current();
        } else {
          setState('idle');
        }
        break;

      case 'result':
        onTranscriptReceivedRef.current(data.text as string);
        setState('idle');
        break;

      case 'error':
        toast.error(data.error as string);
        setState('error');
        break;
    }
  }, []);

  // Worker initialization on mount (D-06: pre-load model from cache)
  useEffect(() => {
    const worker = new Worker(new URL('../workers/whisper.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.addEventListener('message', handleWorkerMessage);

    // Pre-load model from cache on mount (D-06)
    worker.postMessage({ type: 'load' });
    setState('loading');

    return () => {
      worker.removeEventListener('message', handleWorkerMessage);
      worker.terminate();
      workerRef.current = null;
    };
  }, [handleWorkerMessage]);

  // Stop recording and send to Worker for transcription
  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || stateRef.current !== 'recording') {
      return;
    }

    return new Promise<void>((resolve) => {
      const recorder = mediaRecorderRef.current!;

      recorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) {
          cleanup();
          toast.error(texts.chat.localTranscribe.noAudioRecorded);
          setState('idle');
          resolve();
          return;
        }

        // Store chunks before cleanup
        const audioChunks = [...audioChunksRef.current];

        // Stop timer and stream
        cleanup();

        setState('transcribing');

        try {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const audioData = await resampleToMono16kHz(audioBlob);

          // Transfer audio to Worker with Transferable (zero-copy) (AUDIO-03)
          workerRef.current!.postMessage({ type: 'transcribe', audio: audioData, language: languageRef.current }, [
            audioData.buffer,
          ]);
        } catch {
          toast.error(texts.chat.localTranscribe.transcriptionFailed);
          setState('error');
        }

        resolve();
      };

      // Request any remaining data before stopping
      if (recorder.state === 'recording') {
        recorder.requestData();
        recorder.stop();
      }
    });
  }, [cleanup]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (stateRef.current !== 'idle' && stateRef.current !== 'error') {
      return;
    }

    if (!modelLoadedRef.current) {
      // Model not loaded -- trigger download and set pending (D-04)
      pendingRecordRef.current = true;
      setState('downloading');
      workerRef.current?.postMessage({ type: 'load' });
      return;
    }

    // Model loaded -- start recording immediately
    await beginRecording();
  }, [beginRecording]);

  // Toggle recording
  const toggleRecording = useCallback(async () => {
    if (stateRef.current === 'idle' || stateRef.current === 'error') {
      await startRecording();
    } else if (stateRef.current === 'recording') {
      await stopRecording();
    }
    // Do nothing for 'downloading', 'loading', 'transcribing' (D-05)
  }, [startRecording, stopRecording]);

  // Cleanup MediaRecorder on unmount
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
    downloadProgress,
    isRecording: state === 'recording',
    isTranscribing: state === 'transcribing',
    isDownloading: state === 'downloading',
    toggleRecording,
  };
}
