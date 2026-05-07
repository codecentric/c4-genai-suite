# Phase 2: Core Transcription Pipeline - Pattern Map

**Mapped:** 2026-05-07
**Files analyzed:** 6 (3 source files + 3 test files)
**Analogs found:** 4 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/hooks/useLocalTranscribe.ts` | hook | event-driven (Worker messages + MediaRecorder) | `frontend/src/hooks/useTranscribe.ts` | exact |
| `frontend/src/workers/whisper.worker.ts` | utility (worker) | event-driven (postMessage) | *none* | no-analog |
| `frontend/src/lib/audio-utils.ts` | utility | transform (audio resampling) | `frontend/src/lib/index.ts` | partial (same dir, different purpose) |
| `frontend/src/texts/languages/en.ts` | config (i18n) | -- (modification) | self (existing `transcribe` block, lines 180-190) | exact |
| `frontend/src/texts/languages/de.ts` | config (i18n) | -- (modification) | self (existing `transcribe` block, lines 182-193) | exact |
| `frontend/src/hooks/useLocalTranscribe.ui-unit.spec.ts` | test | -- | `frontend/src/pages/chat/conversation/ChatInput.ui-unit.spec.tsx` | role-match |
| `frontend/src/workers/whisper.worker.ui-unit.spec.ts` | test | -- | `frontend/src/pages/admin/dashboard/hooks.integration.spec.tsx` | partial |
| `frontend/src/lib/audio-utils.ui-unit.spec.ts` | test | -- | `frontend/src/pages/chat/conversation/ChatInput.ui-unit.spec.tsx` | role-match |

## Pattern Assignments

### `frontend/src/hooks/useLocalTranscribe.ts` (hook, event-driven)

**Analog:** `frontend/src/hooks/useTranscribe.ts`

This is the primary file for this phase. The existing `useTranscribe` hook is an exact analog -- same role (React hook), same domain (audio transcription), same APIs (MediaRecorder, toast, cleanup). The new hook extends the state machine with `downloading` and `loading` states and replaces the cloud API call with Worker-based inference.

**Imports pattern** (lines 1-5):
```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useApi } from 'src/api';        // NOT needed for local -- replace with Worker import
import { buildError } from 'src/lib';
import { texts } from 'src/texts';
```

**Props/Types pattern** (lines 7-13):
```typescript
interface UseTranscribeProps {
  extensionId: number;
  onTranscriptReceived: (transcript: string) => void;
  maxDurationMs?: number;
}

export type TranscribeState = 'idle' | 'recording' | 'transcribing' | 'error';
```
New hook should follow same structure but with extended state type and different props (language instead of extensionId, download progress output).

**Refs pattern** (lines 18-23):
```typescript
const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const audioChunksRef = useRef<Blob[]>([]);
const streamRef = useRef<MediaStream | null>(null);
const timerRef = useRef<number | null>(null);
const startTimeRef = useRef<number>(0);
const mimeTypeRef = useRef<string>('audio/webm');
```
New hook adds `workerRef = useRef<Worker | null>(null)` and `modelLoadedRef = useRef<boolean>(false)`.

**Cleanup pattern** (lines 28-38):
```typescript
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
```

**Recording start pattern** (lines 108-174):
```typescript
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

    const mimeType = 'audio/webm';
    mimeTypeRef.current = mimeType;
    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mediaRecorder;

    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onerror = (_event) => {
      toast.error(texts.chat.transcribe.recordingStartFailed);
      cleanup();
      setRecordingState('error');
    };

    mediaRecorder.start(100);
    setRecordingState('recording');
    startTimeRef.current = Date.now();

    // Start duration timer
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
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
```

**Stop recording + transcription pattern** (lines 41-104):
```typescript
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

      const audioChunks = [...audioChunksRef.current];
      cleanup();
      setRecordingState('transcribing');

      try {
        const audioBlob = new Blob(audioChunks, { type: mimeTypeRef.current });
        // ... cloud API call here -- replace with:
        // 1. resampleToMono16kHz(audioBlob)
        // 2. worker.postMessage({ type: 'transcribe', audio, language }, [audio.buffer])

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

    if (recorder.state === 'recording') {
      recorder.requestData();
      recorder.stop();
    }
  });
}, [recordingState, transcription, extensionId, onTranscriptReceived, cleanup]);
```

**Toggle + Effect cleanup pattern** (lines 177-200):
```typescript
const toggleRecording = useCallback(async () => {
  if (recordingState === 'idle' || recordingState === 'error') {
    await startRecording();
  } else if (recordingState === 'recording') {
    await stopRecording();
  }
}, [recordingState, startRecording, stopRecording]);

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
```

---

### `frontend/src/workers/whisper.worker.ts` (utility/worker, event-driven)

**Analog:** None -- no Web Workers exist in the frontend codebase yet.

**Pattern source:** RESEARCH.md provides a complete reference implementation (Code Examples section). The Vite worker configuration is already in place:

**Vite worker config** (`frontend/vite.config.ts` lines 45-47):
```typescript
worker: {
  format: 'es',
},
```

**Vite optimizeDeps** (`frontend/vite.config.ts` lines 42-44):
```typescript
optimizeDeps: {
  exclude: ['@huggingface/transformers'],
},
```

**Worker instantiation pattern** (from Vite docs -- standard for ES module workers):
```typescript
// In the hook file:
const worker = new Worker(
  new URL('../workers/whisper.worker.ts', import.meta.url),
  { type: 'module' }
);
```

No codebase analog exists. Planner should use RESEARCH.md "Complete Worker Implementation" code example as the pattern source.

---

### `frontend/src/lib/audio-utils.ts` (utility, transform)

**Analog:** `frontend/src/lib/index.ts` (same directory, establishes module pattern)

The `lib/` directory currently contains a single `index.ts` barrel file with pure utility functions. The new `audio-utils.ts` should follow the same style: pure exported functions, no classes, explicit types, JSDoc-style comments.

**Module pattern** (`frontend/src/lib/index.ts` lines 9-11, representative function):
```typescript
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Error handling pattern** (`frontend/src/lib/index.ts` lines 54-86):
```typescript
export async function buildError(common: string, details?: string | Error | null) {
  // ... processes error with type narrowing, returns string
}
```

The `audio-utils.ts` file should export standalone async functions (`resampleToMono16kHz`) following the same pattern: exported, async, typed parameters and return, no side effects.

---

### `frontend/src/texts/languages/en.ts` (i18n, modification)

**Analog:** Self -- the existing `transcribe` block (lines 180-190)

**Existing transcribe text block** (lines 180-190):
```typescript
transcribe: {
  browserNotSupported: 'Browser does not support audio recording.',
  microphonePermissionDenied: 'Microphone permission denied. Please allow microphone access in your browser settings.',
  recordingStartFailed: 'Failed to start recording. Please check your microphone.',
  noAudioRecorded: 'No audio was recorded. Please try again.',
  transcriptionFailed: 'Failed to transcribe audio. Please try again.',
  maxDurationReached: 'Maximum recording duration reached. Transcribing audio...',
  startRecording: 'Start recording',
  stopRecording: 'Stop recording and transcribe',
  transcribing: 'Transcribing...',
},
```

New `localTranscribe` block should be added as a sibling to `transcribe` with keys for: downloading, loading, model download progress, local transcription errors.

---

### `frontend/src/texts/languages/de.ts` (i18n, modification)

**Analog:** Self -- the existing `transcribe` block (lines 182-193)

**Existing transcribe text block** (lines 182-193):
```typescript
transcribe: {
  browserNotSupported: 'Der Browser unterstützt keine Audioaufnahme.',
  microphonePermissionDenied:
    'Mikrofonberechtigung verweigert. Bitte erlauben Sie den Mikrofonzugriff in Ihren Browsereinstellungen.',
  recordingStartFailed: 'Aufnahme konnte nicht gestartet werden. Bitte überprüfen Sie Ihr Mikrofon.',
  noAudioRecorded: 'Es wurde kein Audio aufgenommen. Bitte versuchen Sie es erneut.',
  transcriptionFailed: 'Transkription fehlgeschlagen. Bitte versuchen Sie es erneut.',
  maxDurationReached: 'Maximale Aufnahmedauer erreicht. Audio wird transkribiert...',
  startRecording: 'Aufnahme starten',
  stopRecording: 'Aufnahme stoppen und transkribieren',
  transcribing: 'Transkription läuft...',
},
```

Mirror the English `localTranscribe` block structure with German translations.

---

### Test Files

#### `frontend/src/hooks/useLocalTranscribe.ui-unit.spec.ts` (test)

**Analog:** `frontend/src/pages/chat/conversation/ChatInput.ui-unit.spec.tsx` (UI unit test pattern) and `frontend/src/pages/admin/dashboard/hooks.integration.spec.tsx` (hook testing pattern)

**Test file structure** (ChatInput.ui-unit.spec.tsx lines 1-7):
```typescript
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfigurationDto, FileDto } from 'src/api';
import { useConversationBucketAvailabilities } from 'src/hooks/api/extensions';
import { useConversationFiles } from 'src/hooks/api/files';
import { render } from 'src/pages/admin/test-utils';
import { ChatInput } from './ChatInput';
```

**vi.mock pattern** (ChatInput.ui-unit.spec.tsx lines 9-19):
```typescript
vi.mock('src/api', () => ({
  useApi: () => ({}),
}));

vi.mock('src/hooks/api/extensions', () => ({
  useConversationBucketAvailabilities: vi.fn(),
}));
```

**Hook testing with renderHook** (hooks.integration.spec.tsx lines 34-35):
```typescript
import { renderHook } from '../test-utils';
// ...
const { result } = renderHook(() => useUsersCount(FilterInterval.Day));
```

**Test-utils renderHook** (test-utils.tsx lines 15-16):
```typescript
const customHookRender = (hook: (props: unknown) => unknown) => renderHook(hook, { wrapper: AllTheProviders });
```

For the Worker-based hook tests, `vi.mock` will be needed to mock the Worker constructor and postMessage. The test pattern should follow `describe/it` blocks with `vi.fn()` for callbacks.

#### `frontend/src/workers/whisper.worker.ui-unit.spec.ts` and `frontend/src/lib/audio-utils.ui-unit.spec.ts` (tests)

Follow the same import and structure patterns as above. These test pure functions/modules so they need less mocking infrastructure than the hook test.

---

## Shared Patterns

### Toast Notifications
**Source:** `frontend/src/hooks/useTranscribe.ts` (lines 53, 70, 89, 145, 163, 169)
**Apply to:** `useLocalTranscribe.ts`
```typescript
import { toast } from 'react-toastify';
import { texts } from 'src/texts';

// Error toasts
toast.error(texts.chat.transcribe.noAudioRecorded);
toast.error(texts.chat.transcribe.transcriptionFailed);
toast.error(texts.chat.transcribe.microphonePermissionDenied);

// Info toasts
toast.info(texts.chat.transcribe.maxDurationReached);
```
The local transcribe hook should use `texts.chat.localTranscribe.*` keys following the same pattern.

### MediaRecorder Setup
**Source:** `frontend/src/hooks/useTranscribe.ts` (lines 117-164)
**Apply to:** `useLocalTranscribe.ts` (recording portion is identical)
```typescript
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const mimeType = 'audio/webm';
const mediaRecorder = new MediaRecorder(stream, { mimeType });
audioChunksRef.current = [];

mediaRecorder.ondataavailable = (event) => {
  if (event.data.size > 0) {
    audioChunksRef.current.push(event.data);
  }
};

mediaRecorder.start(100); // 100ms timeslice
```

### Cleanup Pattern
**Source:** `frontend/src/hooks/useTranscribe.ts` (lines 28-38, 186-193)
**Apply to:** `useLocalTranscribe.ts`
```typescript
// Cleanup function stops stream, clears timer, resets chunks
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

// Effect cleanup on unmount
useEffect(() => {
  return () => {
    cleanup();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };
}, [cleanup]);
```
The local variant must also terminate the Worker on unmount: `workerRef.current?.terminate()`.

### Error Handling with buildError
**Source:** `frontend/src/lib/index.ts` (lines 54-86)
**Apply to:** `useLocalTranscribe.ts`
```typescript
import { buildError } from 'src/lib';
// ...
const errorMessage = await buildError(texts.chat.transcribe.transcriptionFailed, err as Error);
toast.error(errorMessage);
```

### Test Infrastructure
**Source:** `frontend/src/pages/admin/test-utils.tsx`
**Apply to:** All test files
```typescript
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '../test-utils'; // for hook tests
// vi.mock for external dependencies
// vi.fn() for callback spies
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `frontend/src/workers/whisper.worker.ts` | utility (worker) | event-driven (postMessage) | No Web Workers exist in the frontend codebase. This is the first worker. Use RESEARCH.md "Complete Worker Implementation" code example and "Pattern 1: Web Worker Singleton Pipeline" as the reference pattern. Vite worker config (`worker: { format: 'es' }`) and `optimizeDeps: { exclude: ['@huggingface/transformers'] }` are already in place. |

---

## Metadata

**Analog search scope:** `frontend/src/hooks/`, `frontend/src/lib/`, `frontend/src/workers/`, `frontend/src/texts/languages/`, `frontend/src/pages/` (test files), `frontend/vite.config.ts`
**Files scanned:** 12 (hooks directory listing, lib/index.ts, test files, i18n files, vite config)
**Pattern extraction date:** 2026-05-07
