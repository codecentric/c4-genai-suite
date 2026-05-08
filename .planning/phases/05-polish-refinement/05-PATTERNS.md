# Phase 5: Polish & Refinement - Pattern Map

**Mapped:** 2026-05-08
**Files analyzed:** 8 (2 new, 6 modified)
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/pages/chat/conversation/RecordingTimer.tsx` (new) | component | transform | `frontend/src/pages/chat/conversation/DownloadProgressBanner.tsx` | exact |
| `frontend/src/pages/chat/conversation/PrivacyBadge.tsx` (new) | component | transform | `frontend/src/pages/chat/conversation/DownloadProgressBanner.tsx` | role-match |
| `frontend/src/hooks/useLocalTranscribe.ts` (modify) | hook | event-driven | self (existing code) | exact |
| `frontend/src/workers/whisper.worker.ts` (modify) | utility | transform | self (existing code) | exact |
| `frontend/src/pages/chat/conversation/ChatInput.tsx` (modify) | component | request-response | self (existing code, lines 312-346) | exact |
| `frontend/src/texts/languages/en.ts` (modify) | config | N/A | self (existing `localTranscribe` block, lines 191-212) | exact |
| `frontend/src/texts/languages/de.ts` (modify) | config | N/A | self (existing `localTranscribe` block, lines 194-216) | exact |
| `frontend/src/pages/chat/conversation/LocalTranscribeButton.tsx` (no change) | component | event-driven | N/A | N/A |

## Pattern Assignments

### `frontend/src/pages/chat/conversation/RecordingTimer.tsx` (new component, transform)

**Analog:** `frontend/src/pages/chat/conversation/DownloadProgressBanner.tsx`

**Imports pattern** (lines 1-5):
```typescript
import { useEffect, useState } from 'react';
import { ActionIcon, Progress } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { DownloadProgress } from 'src/hooks/useLocalTranscribe';
import { texts } from 'src/texts';
```
Adapt: RecordingTimer needs no Mantine components or icons. Import only `texts` from `src/texts`. No `useState`/`useEffect` needed (pure presentational component).

**Interface + export pattern** (lines 7-13):
```typescript
interface DownloadProgressBannerProps {
  downloadProgress: DownloadProgress;
  onCancel: () => void;
  isDownloading: boolean;
}

export function DownloadProgressBanner({ downloadProgress, onCancel, isDownloading }: DownloadProgressBannerProps) {
```
Adapt: Define `RecordingTimerProps` with `elapsedSeconds: number` and `maxSeconds: number`. Export as named function.

**Styling pattern** (lines 33-50): Tailwind classes inline on `<div>` and `<span>` elements. Uses `className` strings with conditional logic. Uses `text-sm font-semibold text-gray-700` and `text-sm text-gray-500` sizing patterns.

**Accessibility pattern** (lines 35-37):
```typescript
<div
  className="mb-2 flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2"
  role="status"
  aria-live="polite"
>
```
Adapt: RecordingTimer should use `aria-label` with i18n text and `aria-live="off"` (timer updates too frequently for screen reader announcements).

---

### `frontend/src/pages/chat/conversation/PrivacyBadge.tsx` (new component, transform)

**Analog:** `frontend/src/pages/chat/conversation/DownloadProgressBanner.tsx`

**Icon import pattern** (line 3):
```typescript
import { IconX } from '@tabler/icons-react';
```
Adapt: Import `IconShieldCheck` instead. Pattern confirmed: tabler icons imported individually.

**Tooltip pattern** — from `LocalTranscribeButton.tsx` (lines 49-50):
```typescript
data-tooltip-id="default"
data-tooltip-content={getButtonLabel()}
```
This is the project-standard tooltip pattern. Apply to PrivacyBadge's outer element.

**Styling pattern** — from `DownloadProgressBanner.tsx` (line 40):
```typescript
<span className="text-sm font-semibold text-green-600">{texts.chat.localTranscribe.downloadReady}</span>
```
Adapt: Use `text-sm text-green-700` for badge text. Green color family is established for positive/success states.

**i18n text pattern** — from `DownloadProgressBanner.tsx` (lines 40, 43):
```typescript
{texts.chat.localTranscribe.downloadReady}
{texts.chat.localTranscribe.downloadingModel}
```
Adapt: Use `texts.chat.localTranscribe.privacyBadge` and `texts.chat.localTranscribe.privacyTooltip`.

---

### `frontend/src/hooks/useLocalTranscribe.ts` (modify hook, event-driven)

**Analog:** self (existing code)

**State declaration pattern** (lines 21-22):
```typescript
const [state, setState] = useState<LocalTranscribeState>('idle');
const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
```
Add: `const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);`

**Interval timer pattern** (lines 104-114):
```typescript
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
```
Modify: Add `setElapsedSeconds(Math.floor(elapsed / 1000))` inside the interval. Only update when whole-second value changes to avoid re-render thrashing.

**Worker message switch pattern** (lines 136-217):
```typescript
switch (data.status) {
  case 'download':
  case 'initiate':
    // ...
    break;
  // ...
  case 'result': {
    const text = (data.text as string) ?? '';
    if (text.trim() === '') {
      toast.info(texts.chat.localTranscribe.emptyTranscription);
    } else {
      onTranscriptReceivedRef.current(text);
    }
    setState('idle');
    break;
  }
```
Add new case after `'result'` (before `'error'`):
```typescript
case 'silence': {
  toast.info(texts.chat.localTranscribe.silenceDetected);
  setState('idle');
  break;
}
```

**Cleanup pattern** (lines 63-73):
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
Add: `setElapsedSeconds(0);` inside cleanup to reset elapsed time.

**Return value pattern** (lines 362-371):
```typescript
return {
  state,
  downloadProgress,
  isSupported,
  isRecording: state === 'recording',
  isTranscribing: state === 'transcribing',
  isDownloading: state === 'downloading',
  toggleRecording,
  cancelDownload,
};
```
Add: `elapsedSeconds,` to the returned object.

---

### `frontend/src/workers/whisper.worker.ts` (modify utility, transform)

**Analog:** self (existing code)

**Constant declaration pattern** (lines 10-13):
```typescript
const LANGUAGE_MAP: Record<string, string> = {
  de: 'german',
  en: 'english',
};
```
Add new constants at module top level (after `LANGUAGE_MAP`): `SILENCE_RMS_THRESHOLD`, `HALLUCINATION_PATTERNS` array, `computeRMS()` function, `isHallucination()` function.

**Transcribe handler pattern** (lines 75-101):
```typescript
if (type === 'transcribe') {
  try {
    const audio = event.data.audio;
    const language = event.data.language ?? 'en';
    const transcriber = await TranscriberPipeline.getInstance();
    const whisperLanguage = LANGUAGE_MAP[language] ?? 'english';

    if (!audio) {
      self.postMessage({ status: 'error', error: 'No audio data provided', code: 'no_audio' });
      return;
    }

    const result = (await transcriber(audio, {
      language: whisperLanguage,
      task: 'transcribe',
    })) as AutomaticSpeechRecognitionOutput | AutomaticSpeechRecognitionOutput[];

    const output = Array.isArray(result) ? result[0] : result;
    self.postMessage({ status: 'result', text: output.text.trim() });
  } catch (error: unknown) {
    self.postMessage({
      status: 'error',
      error: error instanceof Error ? error.message : 'Transcription failed',
      code: 'transcription_failed',
    });
  }
}
```
Modify: Insert RMS check after the `!audio` guard (before `transcriber()` call). Insert hallucination filter after `output.text.trim()` (before posting result).

**postMessage pattern** (line 93):
```typescript
self.postMessage({ status: 'result', text: output.text.trim() });
```
New silence status uses same shape: `self.postMessage({ status: 'silence' });`

---

### `frontend/src/pages/chat/conversation/ChatInput.tsx` (modify component, request-response)

**Analog:** self (existing code)

**Import pattern** (lines 1-19): Relative imports for same-directory components use `./` prefix:
```typescript
import { DownloadProgressBanner } from './DownloadProgressBanner';
import { LocalTranscribeButton } from './LocalTranscribeButton';
```
Add: `import { RecordingTimer } from './RecordingTimer';` and `import { PrivacyBadge } from './PrivacyBadge';`

**Conditional rendering integration point** (lines 323-333):
```typescript
) : showLocalTranscribe && localTranscribeHook.isSupported ? (
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
Modify: Wrap `LocalTranscribeButton` in a fragment with `PrivacyBadge` and conditional `RecordingTimer`. Timer is visible only when `localTranscribeHook.isRecording`. Badge is always visible when condition is met.

**Button row container pattern** (line 312):
```typescript
<div className="flex items-center gap-1">
```
Timer and badge render inside this flex container, inline with the mic button.

---

### `frontend/src/texts/languages/en.ts` (modify config)

**Analog:** self (existing `localTranscribe` block)

**i18n key pattern** (lines 191-212):
```typescript
localTranscribe: {
  downloadingModel: 'Downloading speech recognition model...',
  downloadFailed: 'Failed to download speech recognition model. Please try again.',
  // ... existing keys ...
  downloadSize: '{{loaded}} MB / {{total}} MB',
},
```
Add 4 new keys at end of `localTranscribe` block:
- `silenceDetected` -- toast message for silence/hallucination detection
- `privacyBadge` -- badge label text
- `privacyTooltip` -- tooltip text for badge
- `timerLabel` -- aria-label for timer element

---

### `frontend/src/texts/languages/de.ts` (modify config)

**Analog:** self (existing `localTranscribe` block)

**i18n key pattern** (lines 194-216): Same structure as `en.ts`. Add the same 4 keys with German translations.

---

## Shared Patterns

### Toast Notifications
**Source:** `frontend/src/hooks/useLocalTranscribe.ts` lines 94, 112, 117-119, 187, 248, 271
**Apply to:** useLocalTranscribe.ts (new `silence` status handler)
```typescript
// Info toast for non-error user feedback
toast.info(texts.chat.localTranscribe.emptyTranscription);

// Error toast for failures
toast.error(texts.chat.localTranscribe.recordingStartFailed);
```
The `silence` status uses `toast.info()` (not `toast.error()`) -- consistent with `emptyTranscription` handling on line 187.

### Worker Message Protocol
**Source:** `frontend/src/workers/whisper.worker.ts` lines 55, 71, 83-84, 93, 95-99
**Apply to:** whisper.worker.ts (new `silence` status), useLocalTranscribe.ts (new `silence` case)
```typescript
// Worker sends:
self.postMessage({ status: 'ready' });
self.postMessage({ status: 'result', text: output.text.trim() });
self.postMessage({ status: 'error', error: message, code });

// New status follows same shape:
self.postMessage({ status: 'silence' });
```

### Component Tooltip Convention
**Source:** `frontend/src/pages/chat/conversation/LocalTranscribeButton.tsx` lines 49-50
**Apply to:** PrivacyBadge.tsx
```typescript
data-tooltip-id="default"
data-tooltip-content={getButtonLabel()}
```
Project uses `data-tooltip-id="default"` with `data-tooltip-content` attributes (presumably react-tooltip or similar library). All interactive elements with tooltips follow this pattern.

### Tailwind Icon Sizing
**Source:** `frontend/src/pages/chat/conversation/LocalTranscribeButton.tsx` line 54, `TranscribeButton.tsx` line 40
**Apply to:** PrivacyBadge.tsx
```typescript
<IconMicrophone className="w-4" />
<IconX className="w-3" />
```
Icons use Tailwind width classes for sizing. Small icons use `w-3`, standard icons use `w-4`.

### Component Test Pattern
**Source:** `frontend/src/pages/chat/conversation/DownloadProgressBanner.ui-unit.spec.tsx` lines 1-12
**Apply to:** RecordingTimer.ui-unit.spec.tsx, PrivacyBadge.ui-unit.spec.tsx
```typescript
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'src/pages/admin/test-utils';
import { DownloadProgressBanner } from './DownloadProgressBanner';

const defaultProps = {
  downloadProgress: { loaded: 66060288, total: 146800640, percentage: 45 },
  onCancel: vi.fn(),
  isDownloading: true,
};

describe('DownloadProgressBanner', () => {
  it('should render ...', () => {
    render(<DownloadProgressBanner {...defaultProps} />);
    // assertions using screen.getByRole, screen.getByText
  });
});
```
Key conventions:
- Import `render` from `src/pages/admin/test-utils` (wraps with providers)
- Import `screen` from `@testing-library/react`
- Define `defaultProps` constant outside describe block
- Test names start with `should`
- Use `screen.getByRole()` and `screen.getByText()` for queries
- File naming: `ComponentName.ui-unit.spec.tsx`

### Hook Test Pattern
**Source:** `frontend/src/hooks/useLocalTranscribe.ui-unit.spec.ts` lines 1-5, 154-183
**Apply to:** useLocalTranscribe.ui-unit.spec.ts (new tests for `elapsedSeconds` and `silence`)
```typescript
import { act, renderHook } from '@testing-library/react';
import { toast } from 'react-toastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ... mocks at top of file ...

describe('useLocalTranscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal('WebAssembly', {});
    vi.stubGlobal('crossOriginIsolated', true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const defaultProps = {
    language: 'de',
    onTranscriptReceived: vi.fn(),
  };

  it('starts in idle state with downloadProgress null', () => {
    const { result } = renderHook(() => useLocalTranscribe(defaultProps));
    expect(result.current.state).toBe('idle');
  });
});
```
Key conventions:
- `renderHook` imported from `@testing-library/react` (NOT from test-utils)
- `vi.useFakeTimers()` in `beforeEach`, `vi.useRealTimers()` in `afterEach`
- `simulateWorkerMessage()` helper sends data to captured handler
- `act()` wraps all state-changing operations
- File naming: `hookName.ui-unit.spec.ts` (no x -- not JSX)

### Worker Test Pattern
**Source:** `frontend/src/workers/whisper.worker.ui-unit.spec.ts` lines 1-48, 233-296
**Apply to:** whisper.worker.ui-unit.spec.ts (new tests for RMS and hallucination filter)
```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockTranscriber = vi.fn();
const mockPipeline = vi.fn().mockResolvedValue(mockTranscriber);

vi.mock('@huggingface/transformers', () => ({
  pipeline: mockPipeline,
  env: { allowLocalModels: false },
}));

// Helper to import the worker module and extract the message handler
async function importWorkerAndGetHandler(
  addEventListenerSpy: ReturnType<typeof vi.fn>,
): Promise<(event: MessageEvent) => Promise<void>> {
  await import('./whisper.worker');
  const call = addEventListenerSpy.mock.calls.find((args: unknown[]) => args[0] === 'message');
  expect(call).toBeDefined();
  return call![1];
}

describe('whisper.worker', () => {
  let messageHandler: (event: MessageEvent) => Promise<void>;
  const mockPostMessage = vi.fn();

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
Key conventions:
- Worker module re-imported each test via `vi.resetModules()` + dynamic `import()`
- `self.postMessage` stubbed as `mockPostMessage`
- `self.addEventListener` stubbed to capture message handler
- Tests send `MessageEvent` objects: `new MessageEvent('message', { data: { type: 'transcribe', audio: new Float32Array([0.1, 0.2]), language: 'en' } })`
- Assertions check `mockPostMessage` calls for expected status codes

## No Analog Found

No files in this phase lack a close analog. All new components follow established patterns from `DownloadProgressBanner.tsx` (same directory, same project phase, same component role). All modified files extend their own existing patterns.

## Metadata

**Analog search scope:** `frontend/src/pages/chat/conversation/`, `frontend/src/hooks/`, `frontend/src/workers/`, `frontend/src/texts/languages/`
**Files scanned:** 12 source files + 4 test files
**Pattern extraction date:** 2026-05-08
