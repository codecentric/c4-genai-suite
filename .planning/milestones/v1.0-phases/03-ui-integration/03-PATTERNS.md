# Phase 3: UI Integration - Pattern Map

**Mapped:** 2026-05-07
**Files analyzed:** 7 (2 new, 5 modified)
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/pages/chat/conversation/LocalTranscribeButton.tsx` | component | event-driven | `frontend/src/pages/chat/conversation/SpeechRecognitionButton.tsx` | exact |
| `frontend/src/pages/chat/conversation/DownloadProgressBanner.tsx` | component | event-driven | (no direct analog -- new pattern; partial match to banner/alert patterns in Mantine) | no-analog |
| `frontend/src/pages/chat/conversation/ChatInput.tsx` | component | event-driven | self (existing file) | exact |
| `frontend/src/hooks/useLocalTranscribe.ts` | hook | event-driven | self (existing file) | exact |
| `frontend/src/texts/languages/en.ts` | config | transform | self (existing file) | exact |
| `frontend/src/texts/languages/de.ts` | config | transform | self (existing file) | exact |
| `frontend/src/texts/index.ts` | config | transform | self (existing file) | exact |

## Pattern Assignments

### `frontend/src/pages/chat/conversation/LocalTranscribeButton.tsx` (NEW component, event-driven)

**Analog:** `frontend/src/pages/chat/conversation/SpeechRecognitionButton.tsx` (layout) + `frontend/src/pages/chat/conversation/TranscribeButton.tsx` (visual states)

**Imports pattern** (SpeechRecognitionButton.tsx lines 1-3):
```typescript
import { ActionIcon, Group, Menu } from '@mantine/core';
import { IconChevronDown, IconMicrophone } from '@tabler/icons-react';
import { texts } from 'src/texts';
```

**Props interface pattern** (SpeechRecognitionButton.tsx lines 5-16):
```typescript
// SpeechRecognitionButton defines Language type + props inline in same file
export interface Language {
  name: string;
  code: string;
}

interface SpeechRecognitionWrapperProps {
  listening: boolean;
  toggleSpeechRecognition: () => void;
  speechLanguage: string;
  setSpeechLanguage: (speechLanguage: string) => void;
  languages: Language[];
}
```

**Layout pattern -- Group + ActionIcon + Menu** (SpeechRecognitionButton.tsx lines 28-81):
```typescript
// Full layout: mic button on left, chevron dropdown on right, wrapped in Group
<div className="flex" style={{ width: 'fit-content' }}>
  <Group wrap="nowrap" gap={0} align="stretch">
    <ActionIcon
      variant={listening ? 'filled' : 'outline'}
      size="lg"
      color={listening ? 'red' : 'black'}
      className={`border-gray-200 ${listening ? 'animate-pulse' : ''} rounded-r-none border-r-0`}
      onClick={toggleSpeechRecognition}
      data-tooltip-id="default"
      data-tooltip-content={toolTipText}
      style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, width: '36px' }}
      aria-label={toolTipText}
    >
      <IconMicrophone className="w-4" />
    </ActionIcon>
    <Menu shadow="md" withInitialFocusPlaceholder={false}>
      <Menu.Target>
        <ActionIcon
          variant="outline"
          size="xs"
          className="rounded-l-none"
          disabled={listening}
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
        {languages.map((language) => (
          <Menu.Item
            key={language.code}
            onClick={() => setSpeechLanguage(language.code)}
            color={speechLanguage === language.code ? 'black' : ''}
            fw={speechLanguage === language.code ? 'bold' : ''}
          >
            {language.name}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  </Group>
</div>
```

**Visual state pattern -- recording + transcribing** (TranscribeButton.tsx lines 11-42):
```typescript
// TranscribeButton maps state to visual props:
// Recording: variant="filled", color="red", animate-pulse, aria-label from text
// Transcribing: loading={true}, disabled={true}
// Idle: variant="outline", color="black"
export function TranscribeButton({ isRecording, isTranscribing, onToggle }: TranscribeButtonProps) {
  const getButtonText = () => {
    if (isTranscribing) {
      return texts.chat.transcribe.transcribing;
    }
    if (isRecording) {
      return texts.chat.transcribe.stopRecording;
    }
    return texts.chat.transcribe.startRecording;
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
      data-tooltip-id="default"
      data-tooltip-content={getButtonText()}
      disabled={isTranscribing}
      loading={isTranscribing}
      aria-label={getButtonText()}
    >
      <IconMicrophone className="w-4" />
    </ActionIcon>
  );
}
```

**Key differences for LocalTranscribeButton vs analogs:**
- Combines SpeechRecognitionButton layout (Group + Menu) with TranscribeButton visual states (recording/transcribing)
- Adds `isDownloading` state: button disabled, no special icon (banner handles progress)
- Language items use code-only labels (`'de'` / `'en'`) not `Language.name`
- Chevron disabled during `isRecording || isTranscribing || isDownloading`
- Uses `loading={isTranscribing}` from TranscribeButton pattern (D-12)

---

### `frontend/src/pages/chat/conversation/DownloadProgressBanner.tsx` (NEW component, event-driven)

**Analog:** No direct analog in codebase (Mantine Progress not used anywhere yet). Use Mantine component API directly.

**Imports pattern** (derive from project conventions):
```typescript
import { ActionIcon, Progress } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { texts } from 'src/texts';
```

**Mantine ActionIcon close button pattern** (SpeechRecognitionButton.tsx lines 47-62 for ActionIcon styling):
```typescript
// Cancel button uses same ActionIcon conventions as rest of project:
// size="xs", variant="subtle" or "outline", Tabler icon, aria-label from texts
<ActionIcon
  variant="subtle"
  size="xs"
  onClick={onCancel}
  aria-label={texts.chat.localTranscribe.downloadCancelLabel}
>
  <IconX className="w-3" />
</ActionIcon>
```

**Styling pattern** (ChatInput.tsx lines 234 for box/border styling):
```typescript
// ChatInput box styling convention: rounded borders, gray-200 border, shadow, padding
<div className="box-border rounded-2xl border border-gray-200 p-4 pb-3 shadow-2xl shadow-gray-100 ...">
```

**No analog for Progress bar** -- use Mantine `<Progress value={percentage} />` directly. Mantine auto-provides `role="progressbar"` and `aria-valuenow`.

---

### `frontend/src/pages/chat/conversation/ChatInput.tsx` (MODIFIED component, event-driven)

**Analog:** self -- extend existing patterns in place

**Voice extension detection pattern** (ChatInput.tsx lines 179-185):
```typescript
const voiceExtensions =
  configuration?.extensions?.filter(
    (e) => e.name === 'speech-to-text' || e.name === 'transcribe-azure' || e.name === 'transcribe-local',
  ) ?? [];
const activeVoiceExtension = voiceExtensions[0];
const showSpeechToText = activeVoiceExtension?.name === 'speech-to-text';
const showTranscribe = activeVoiceExtension?.name === 'transcribe-azure';
// ADD: const showLocalTranscribe = activeVoiceExtension?.name === 'transcribe-local';
```

**Hook call pattern** (ChatInput.tsx lines 187-193):
```typescript
// Existing pattern: conditional hook setup for transcribe-azure
const transcribeExtension = showTranscribe ? activeVoiceExtension : undefined;
const transcribeHook = useTranscribe({
  extensionId: transcribeExtension?.id ?? 0,
  onTranscriptReceived: setInput,
});
const { isRecording, isTranscribing, toggleRecording } = transcribeHook;
// ADD: similar pattern for useLocalTranscribe
```

**Language state pattern** (ChatInput.tsx lines 57-60):
```typescript
// Existing: usePersistentState for speechLanguage (persists across sessions)
const [speechLanguage, setSpeechLanguage] = usePersistentState<string>(
  'speechRecognitionLanguage',
  speechRecognitionLanguages[0].code,
);
// FOR LOCAL TRANSCRIBE: use useState (session-only per D-06), NOT usePersistentState
```

**Conditional button rendering pattern** (ChatInput.tsx lines 294-305):
```typescript
<div className="flex items-center gap-1">
  {showSpeechToText ? (
    <SpeechRecognitionButton
      listening={listening}
      toggleSpeechRecognition={toggleSpeechRecognition}
      speechLanguage={speechLanguage}
      setSpeechLanguage={setSpeechLanguage}
      languages={speechRecognitionLanguages}
    />
  ) : showTranscribe ? (
    <TranscribeButton isRecording={isRecording} isTranscribing={isTranscribing} onToggle={toggleRecording} />
  ) : null}
  // ADD: extend ternary chain with showLocalTranscribe ? <LocalTranscribeButton .../> : null
```

**Submit button disabled state pattern** (ChatInput.tsx line 309):
```typescript
disabled={!input || isDisabled || uploadMutations.some((m) => m.status === 'pending') || listening}
// ADD: || localTranscribeHook.isRecording || localTranscribeHook.isTranscribing
```

**Banner placement** -- render above the textarea, after the file/suggestion area and before the `<form>`. The banner goes inside the outer `<div className="flex flex-col gap-2">` at ChatInput.tsx line 197, before line 233 (the `<form>`).

---

### `frontend/src/hooks/useLocalTranscribe.ts` (MODIFIED hook, event-driven)

**Analog:** self -- add `cancelDownload` function

**Existing return value pattern** (useLocalTranscribe.ts lines 294-301):
```typescript
return {
  state,
  downloadProgress,
  isRecording: state === 'recording',
  isTranscribing: state === 'transcribing',
  isDownloading: state === 'downloading',
  toggleRecording,
};
// ADD: cancelDownload to return object
```

**Worker lifecycle pattern** (useLocalTranscribe.ts lines 189-204):
```typescript
// Worker creation and cleanup pattern to replicate in cancelDownload:
const worker = new Worker(new URL('../workers/whisper.worker.ts', import.meta.url), { type: 'module' });
workerRef.current = worker;
worker.addEventListener('message', handleWorkerMessage);

// Cleanup:
worker.removeEventListener('message', handleWorkerMessage);
worker.terminate();
workerRef.current = null;
```

**useCallback pattern** (useLocalTranscribe.ts lines 275-282):
```typescript
// All public functions use useCallback with ref-based dependencies
const toggleRecording = useCallback(async () => {
  if (stateRef.current === 'idle' || stateRef.current === 'error') {
    await startRecording();
  } else if (stateRef.current === 'recording') {
    await stopRecording();
  }
}, [startRecording, stopRecording]);
```

---

### `frontend/src/texts/languages/en.ts` and `de.ts` (MODIFIED config, transform)

**Analog:** self -- extend existing `localTranscribe` block

**Existing i18n key structure** (en.ts lines 191-204):
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
  // ADD: downloadProgress, downloadCancelLabel, downloadReady, downloadSize
},
```

---

### `frontend/src/texts/index.ts` (MODIFIED config, transform)

**Analog:** self -- extend existing `localTranscribe` block

**Existing translate call pattern** (index.ts lines 221-234):
```typescript
localTranscribe: {
  downloadingModel: translate('chat.localTranscribe.downloadingModel'),
  downloadFailed: translate('chat.localTranscribe.downloadFailed'),
  loadingModel: translate('chat.localTranscribe.loadingModel'),
  loadFailed: translate('chat.localTranscribe.loadFailed'),
  transcriptionFailed: translate('chat.localTranscribe.transcriptionFailed'),
  maxDurationReached: translate('chat.localTranscribe.maxDurationReached'),
  microphonePermissionDenied: translate('chat.localTranscribe.microphonePermissionDenied'),
  recordingStartFailed: translate('chat.localTranscribe.recordingStartFailed'),
  noAudioRecorded: translate('chat.localTranscribe.noAudioRecorded'),
  startRecording: translate('chat.localTranscribe.startRecording'),
  stopRecording: translate('chat.localTranscribe.stopRecording'),
  transcribing: translate('chat.localTranscribe.transcribing'),
  // ADD: downloadProgress, downloadCancelLabel, downloadReady, downloadSize
},
```

**Parameterized text pattern** (index.ts line 79, 111):
```typescript
// For keys with interpolation (like downloadSize with {{loaded}} / {{total}}):
page: (page: number, total: number) => translate('common.page', { page, total }),
uploadLimit: (limit: number, extensionName: string) => translate('common.uploadLimit', { limit, extensionName }),
// ADD: downloadSize: (loaded: string, total: string) => translate('chat.localTranscribe.downloadSize', { loaded, total }),
```

## Shared Patterns

### Component Export Convention
**Source:** All files in `frontend/src/pages/chat/conversation/`
**Apply to:** `LocalTranscribeButton.tsx`, `DownloadProgressBanner.tsx`
```typescript
// Named export (not default), function declaration
export function LocalTranscribeButton({ ... }: LocalTranscribeButtonProps) { ... }
```

### Mantine ActionIcon Conventions
**Source:** `frontend/src/pages/chat/conversation/TranscribeButton.tsx` lines 28-41, `SpeechRecognitionButton.tsx` lines 32-43
**Apply to:** `LocalTranscribeButton.tsx`, `DownloadProgressBanner.tsx`
```typescript
// Standard ActionIcon props used across the project:
// - size="lg" for primary buttons, size="xs" for secondary (chevron, close)
// - variant="outline" for idle, variant="filled" for active
// - color="black" for idle, color="red" for recording
// - className="border-gray-200" for outline buttons
// - data-tooltip-id="default" + data-tooltip-content for tooltips
// - aria-label for accessibility
```

### i18n Text Access
**Source:** `frontend/src/texts/index.ts` lines 1-15
**Apply to:** All new component files
```typescript
import { texts } from 'src/texts';
// Access: texts.chat.localTranscribe.downloadProgress
// Access: texts.accessibility.selectLanguage (reusable existing key)
```

### Test File Conventions
**Source:** `frontend/src/pages/chat/conversation/ChatInput.ui-unit.spec.tsx` lines 1-10
**Apply to:** New test files for `LocalTranscribeButton` and `DownloadProgressBanner`
```typescript
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
// Render helper from shared test-utils:
import { render } from 'src/pages/admin/test-utils';

// Mock pattern for hooks:
vi.mock('src/hooks/useLocalTranscribe', () => ({
  useLocalTranscribe: vi.fn(),
}));

// Test naming: filename.ui-unit.spec.tsx
// Test structure: describe('ComponentName', () => { it('should ...') })
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `frontend/src/pages/chat/conversation/DownloadProgressBanner.tsx` | component | event-driven | No existing banner or progress bar component in the codebase. Mantine `Progress` is not used anywhere yet. Build from Mantine component API (`Progress`, `ActionIcon`) using project styling conventions (Tailwind classes, `border-gray-200`, etc.). |

## Metadata

**Analog search scope:** `frontend/src/pages/chat/conversation/`, `frontend/src/hooks/`, `frontend/src/texts/`, `frontend/src/components/`
**Files scanned:** 12 (analog candidates read in full)
**Pattern extraction date:** 2026-05-07
