# Phase 4: Error Handling - Pattern Map

**Mapped:** 2026-05-08
**Files analyzed:** 7 (5 modified, 2 test files updated)
**Analogs found:** 5 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/hooks/useLocalTranscribe.ts` | hook | event-driven | `frontend/src/hooks/useTranscribe.ts` | role-match |
| `frontend/src/workers/whisper.worker.ts` | worker | event-driven | self (existing file, extend pattern) | exact |
| `frontend/src/pages/chat/conversation/ChatInput.tsx` | component | request-response | self (existing conditional rendering at line 313-334) | exact |
| `frontend/src/texts/languages/en.ts` | config (i18n) | static | self (existing `localTranscribe` block, lines 191-208) | exact |
| `frontend/src/texts/languages/de.ts` | config (i18n) | static | self (existing `localTranscribe` block, lines 194-212) | exact |
| `frontend/src/hooks/useLocalTranscribe.ui-unit.spec.ts` | test | event-driven | self (existing tests, fix + extend) | exact |
| `frontend/src/workers/whisper.worker.ui-unit.spec.ts` | test | event-driven | self (existing tests, extend) | exact |

## Pattern Assignments

### `frontend/src/hooks/useLocalTranscribe.ts` (hook, event-driven)

**Analog:** `frontend/src/hooks/useTranscribe.ts` (cloud transcription hook with similar error/toast patterns)

**Imports pattern** (`useLocalTranscribe.ts` lines 1-4):
```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { resampleToMono16kHz } from 'src/lib/audio-utils';
import { texts } from 'src/texts';
```
No new imports needed. `toast` and `texts` already imported.

**Browser capability detection pattern** (analog: `useSpeechRecognitionToggle.ts` lines 22-25):
```typescript
// useSpeechRecognitionToggle checks capabilities at call time and shows toast on failure:
if (!browserSupportsSpeechRecognition) {
  toast.error(texts.chat.speechRecognition.browserNotSupported);
  return;
}
```
For `useLocalTranscribe`, D-01/D-02/D-03 require a different pattern: a `useState` lazy initializer that checks capabilities once on mount, exposes `isSupported`, and silently hides the button (no toast). The hook should add:
```typescript
// Lazy initializer -- runs once on mount (D-01, D-03)
const [isSupported] = useState<boolean>(() => {
  return (
    typeof Worker !== 'undefined' &&
    typeof WebAssembly !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    self.crossOriginIsolated === true
  );
});
```

**Worker error handler pattern -- current** (`useLocalTranscribe.ts` lines 181-184):
```typescript
case 'error':
  toast.error(data.error as string);
  setState('error');
  break;
```
Must be changed to: (1) read `data.code` and map to i18n key via switch, (2) `setState('idle')` instead of `setState('error')` per D-04/Phase 3 D-13.

**Error-to-idle pattern** (analog: `useTranscribe.ts` lines 79-84, cloud hook sets error state but same principle):
```typescript
// useTranscribe checks empty transcription and shows toast:
if (!result.text || result.text.trim() === '') {
  toast.error(texts.chat.transcribe.transcriptionFailed);
  setRecordingState('error');
  resolve();
  return;
}
```
For `useLocalTranscribe`, D-07/D-08 require `toast.info` (not error) and `setState('idle')` (not error) for empty results.

**Result handler pattern -- current** (`useLocalTranscribe.ts` lines 176-179):
```typescript
case 'result':
  onTranscriptReceivedRef.current(data.text as string);
  setState('idle');
  break;
```
Must be changed to: check `text.trim() === ''` before calling `onTranscriptReceivedRef.current`. If empty, show `toast.info` with empty transcription message, do not insert text.

**Cancel download pattern -- current** (`useLocalTranscribe.ts` lines 281-301):
```typescript
const cancelDownload = useCallback(() => {
  if (stateRef.current !== 'downloading') return;
  // ... terminates worker, resets state ...
  setState('idle');
  // Create fresh worker for future use
  const worker = new Worker(new URL('../workers/whisper.worker.ts', import.meta.url), { type: 'module' });
  workerRef.current = worker;
  worker.addEventListener('message', handleWorkerMessage);
}, [handleWorkerMessage]);
```
Must add `toast.info(texts.chat.localTranscribe.downloadCancelled)` after state resets (D-06).

**Worker initialization guard pattern** (`useLocalTranscribe.ts` lines 188-200):
```typescript
useEffect(() => {
  const worker = new Worker(new URL('../workers/whisper.worker.ts', import.meta.url), { type: 'module' });
  workerRef.current = worker;
  worker.addEventListener('message', handleWorkerMessage);
  return () => {
    worker.removeEventListener('message', handleWorkerMessage);
    worker.terminate();
    workerRef.current = null;
  };
}, [handleWorkerMessage]);
```
Must be guarded with `isSupported` check: if `!isSupported`, skip Worker creation entirely (Pitfall 1).

**Return value pattern -- current** (`useLocalTranscribe.ts` lines 313-321):
```typescript
return {
  state,
  downloadProgress,
  isRecording: state === 'recording',
  isTranscribing: state === 'transcribing',
  isDownloading: state === 'downloading',
  toggleRecording,
  cancelDownload,
};
```
Must add `isSupported` to the return object.

---

### `frontend/src/workers/whisper.worker.ts` (worker, event-driven)

**Analog:** Self -- extend existing error handling pattern.

**Current error handling pattern** (lines 56-61):
```typescript
} catch (error: unknown) {
  self.postMessage({
    status: 'error',
    error: error instanceof Error ? error.message : 'Failed to load model',
  });
}
```
Must be extended to: (1) reset `TranscriberPipeline.instance = null` (Pitfall 3), (2) detect network failure type, (3) send typed `code` field.

**Network detection pattern** (new -- no existing analog in codebase):
```typescript
} catch (error: unknown) {
  // Reset singleton so retry creates fresh pipeline (Pitfall 3)
  TranscriberPipeline.instance = null;

  const message = error instanceof Error ? error.message : 'Failed to load model';
  let code = 'download_failed';

  if (!navigator.onLine) {
    code = 'download_offline';
  } else if (
    error instanceof Error &&
    error.message.toLowerCase().includes('timeout')
  ) {
    code = 'download_timeout';
  }

  self.postMessage({ status: 'error', error: message, code });
}
```

**Transcription error pattern** (lines 83-88) -- also needs `code` field for consistency:
```typescript
} catch (error: unknown) {
  self.postMessage({
    status: 'error',
    error: error instanceof Error ? error.message : 'Transcription failed',
  });
}
```

---

### `frontend/src/pages/chat/conversation/ChatInput.tsx` (component, request-response)

**Analog:** Self -- existing conditional rendering block.

**Current conditional rendering pattern** (lines 323-334):
```typescript
) : showLocalTranscribe ? (
  <LocalTranscribeButton
    state={localTranscribeHook.state}
    isRecording={localTranscribeHook.isRecording}
    isTranscribing={localTranscribeHook.isTranscribing}
    isDownloading={localTranscribeHook.isDownloading}
    onToggle={localTranscribeHook.toggleRecording}
    language={localTranscribeLanguage}
    onLanguageChange={setLocalTranscribeLanguage}
    languages={['de', 'en']}
  />
) : null}
```
Must add `&& localTranscribeHook.isSupported` to the condition:
```typescript
) : showLocalTranscribe && localTranscribeHook.isSupported ? (
```

Also the download progress banner (line 246) should be gated by the same check:
```typescript
{showLocalTranscribe && localTranscribeHook.isSupported && localTranscribeHook.isDownloading && ...}
```

---

### `frontend/src/texts/languages/en.ts` (config/i18n, static)

**Analog:** Self -- existing `localTranscribe` block.

**Current i18n keys** (lines 191-208):
```typescript
localTranscribe: {
  downloadingModel: 'Downloading speech recognition model...',
  downloadFailed: 'Failed to download speech recognition model. Please try again.',
  loadingModel: 'Loading speech recognition model...',
  loadFailed: 'Failed to load speech recognition model.',
  transcriptionFailed: 'Local transcription failed. Please try again.',
  maxDurationReached: 'Maximum recording duration reached. Transcribing audio...',
  microphonePermissionDenied: 'Microphone permission denied. Please allow microphone access in your browser settings.',
  recordingStartFailed: 'Failed to start recording. Please check your microphone.',
  noAudioRecorded: 'No audio was recorded. Please try again.',
  startRecording: 'Start local recording',
  stopRecording: 'Stop recording and transcribe locally',
  transcribing: 'Transcribing locally...',
  downloadProgress: 'Downloading speech recognition model',
  downloadCancelLabel: 'Cancel download',
  downloadReady: 'Ready!',
  downloadSize: '{{loaded}} MB / {{total}} MB',
},
```
Add 3 new keys after `downloadFailed`:
```typescript
downloadFailedOffline: 'No internet connection. Please check your network and try again.',
downloadFailedTimeout: 'Download timed out. Please check your connection and try again.',
downloadCancelled: 'Download cancelled.',
emptyTranscription: 'No speech could be recognized. Try speaking louder or closer to the microphone.',
```

---

### `frontend/src/texts/languages/de.ts` (config/i18n, static)

**Analog:** Self -- existing `localTranscribe` block.

**Current German i18n keys** (lines 194-212):
```typescript
localTranscribe: {
  downloadingModel: 'Spracherkennungsmodell wird heruntergeladen...',
  downloadFailed: 'Spracherkennungsmodell konnte nicht heruntergeladen werden. Bitte versuchen Sie es erneut.',
  // ... (same structure as en.ts)
},
```
Add 3 new keys (same positions as en.ts):
```typescript
downloadFailedOffline: 'Keine Internetverbindung. Bitte überprüfen Sie Ihre Netzwerkverbindung und versuchen Sie es erneut.',
downloadFailedTimeout: 'Download-Zeitlimit überschritten. Bitte überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.',
downloadCancelled: 'Download abgebrochen.',
emptyTranscription: 'Es konnte keine Sprache erkannt werden. Versuchen Sie, lauter oder näher am Mikrofon zu sprechen.',
```

---

### `frontend/src/hooks/useLocalTranscribe.ui-unit.spec.ts` (test, event-driven)

**Analog:** Self -- existing test infrastructure.

**Test mock infrastructure pattern** (lines 33-77):
```typescript
// Worker mock -- captures messageHandler via addEventListener spy
class MockWorkerClass {
  constructor() {
    this.postMessage = vi.fn();
    this.terminate = vi.fn();
    this.removeEventListener = vi.fn();
    this.addEventListener = vi.fn((event: string, handler: (event: MessageEvent) => void) => {
      if (event === 'message') {
        mockWorkerInstance.messageHandler = handler;
      }
    });
    mockWorkerInstance = { /* ... */ };
  }
}
vi.stubGlobal('Worker', MockWorkerClass);
```

**Toast assertion pattern** (lines 362, 439):
```typescript
expect(toast.info).toHaveBeenCalledWith('Maximum recording duration reached. Transcribing audio...');
expect(toast.error).toHaveBeenCalledWith('Something went wrong');
```

**Worker message simulation pattern** (lines 44-48):
```typescript
function simulateWorkerMessage(data: Record<string, unknown>) {
  if (mockWorkerInstance.messageHandler) {
    mockWorkerInstance.messageHandler({ data } as MessageEvent);
  }
}
```

**Tests to fix** (Tests 1, 2, 5, 13 -- assume `'loading'` initial state but hook starts in `'idle'`):
- Test 1 (line 166): `expect(result.current.state).toBe('loading')` should be `'idle'`
- Test 2 (line 182): `expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith({ type: 'load' })` -- hook does NOT post load on mount
- Test 5 (line 243): Assumes `'loading'` state for download progress transitions
- Test 13 (line 458): `expect(result.current.state).toBe('loading')` should be `'idle'`

**New tests needed** follow the same pattern as Test 11 (line 431-440) for error assertions:
```typescript
it('sets error state and shows toast on Worker error', () => {
  const { result } = renderHook(() => useLocalTranscribe(defaultProps));
  act(() => {
    simulateWorkerMessage({ status: 'error', error: 'Something went wrong' });
  });
  expect(result.current.state).toBe('error');
  expect(toast.error).toHaveBeenCalledWith('Something went wrong');
});
```

**Mock texts block** (lines 17-31) needs new keys:
```typescript
downloadFailedOffline: 'No internet connection.',
downloadFailedTimeout: 'Download timed out.',
downloadCancelled: 'Download cancelled.',
emptyTranscription: 'No speech could be recognized.',
```

---

### `frontend/src/workers/whisper.worker.ui-unit.spec.ts` (test, event-driven)

**Analog:** Self -- existing test infrastructure.

**Test setup pattern** (lines 29-48):
```typescript
beforeEach(async () => {
  vi.clearAllMocks();
  mockPipeline.mockResolvedValue(mockTranscriber);
  vi.resetModules();
  vi.stubGlobal('postMessage', mockPostMessage);
  const addEventListenerSpy = vi.fn();
  vi.stubGlobal('addEventListener', addEventListenerSpy);
  vi.stubGlobal('navigator', {});
  messageHandler = await importWorkerAndGetHandler(addEventListenerSpy);
});
```

**Error test pattern** (lines 298-315):
```typescript
it('posts error status when pipeline load fails', async () => {
  mockPipeline.mockRejectedValue(new Error('Network error'));
  vi.resetModules();
  const addEventListenerSpy = vi.fn();
  vi.stubGlobal('addEventListener', addEventListenerSpy);
  const handler = await importWorkerAndGetHandler(addEventListenerSpy);
  const event = new MessageEvent('message', { data: { type: 'load' } });
  await handler(event);
  expect(mockPostMessage).toHaveBeenCalledWith({
    status: 'error',
    error: 'Network error',
  });
});
```
New network error tests follow this pattern but also:
- Stub `navigator.onLine` via `vi.stubGlobal('navigator', { onLine: false })` for offline test
- Assert `code` field in posted message: `expect(mockPostMessage).toHaveBeenCalledWith({ status: 'error', error: '...', code: 'download_offline' })`
- Existing error test assertion (line 311-314) must be updated to expect the `code` field

---

## Shared Patterns

### Toast Error/Info Pattern
**Source:** `react-toastify` usage across codebase
**Apply to:** `useLocalTranscribe.ts` (error handler, empty result, cancel download)
```typescript
// Error toast for failures
toast.error(texts.chat.localTranscribe.downloadFailed);

// Info toast for non-error notifications
toast.info(texts.chat.localTranscribe.downloadCancelled);
```

### Error-to-Idle State Transition
**Source:** CONTEXT.md D-04, Phase 3 D-13
**Apply to:** `useLocalTranscribe.ts` all error handlers
```typescript
// All error paths set state to idle (not error), toast provides feedback
toast.error(message);
setState('idle');
```

### i18n Key Naming Convention
**Source:** `frontend/src/texts/languages/en.ts` lines 191-208
**Apply to:** New i18n keys in `en.ts` and `de.ts`
```
texts.chat.localTranscribe.<camelCaseKey>
```
Existing pattern: `downloadFailed`, `loadFailed`, `microphonePermissionDenied`, `recordingStartFailed`, `noAudioRecorded`
New keys follow same convention: `downloadFailedOffline`, `downloadFailedTimeout`, `downloadCancelled`, `emptyTranscription`

### Worker Message Format
**Source:** `frontend/src/workers/whisper.worker.ts` lines 55-60
**Apply to:** Extended error messages from Worker
```typescript
// Current format:
self.postMessage({ status: 'error', error: string });

// Extended format (backward-compatible):
self.postMessage({ status: 'error', error: string, code: string });
```
The `code` field is additive -- existing `error` field remains for backward compatibility and fallback display.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | -- | -- | All files are modifications to existing code with clear in-codebase patterns |

Note: The `navigator.onLine` network detection in the Worker is a new pattern with no existing analog in the codebase. The research provides the implementation pattern from MDN documentation (RESEARCH.md Pattern 3).

## Metadata

**Analog search scope:** `frontend/src/hooks/`, `frontend/src/workers/`, `frontend/src/pages/chat/conversation/`, `frontend/src/texts/languages/`
**Files scanned:** 10
**Pattern extraction date:** 2026-05-08
