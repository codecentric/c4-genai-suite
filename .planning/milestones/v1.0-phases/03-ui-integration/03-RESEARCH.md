# Phase 3: UI Integration - Research

**Researched:** 2026-05-07
**Domain:** React UI components (Mantine, Tailwind CSS), i18n, accessibility
**Confidence:** HIGH

## Summary

This phase creates two new React components (`LocalTranscribeButton` and `DownloadProgressBanner`) and wires them into the existing `ChatInput.tsx`. The work is entirely frontend -- no backend changes required. All state and behavior is already exposed by the `useLocalTranscribe` hook from Phase 2; this phase is purely presentation and integration.

The main technical challenge is implementing the cancel-download feature (D-03) since the existing `useLocalTranscribe` hook does not expose a `cancelDownload` function. Worker termination and re-creation is the most viable approach. A secondary concern is accessing the admin-configured `defaultLanguage` value, which is not currently exposed through the frontend API DTOs.

**Primary recommendation:** Build two thin components that mirror existing `SpeechRecognitionButton` and `TranscribeButton` patterns exactly, add a `cancelDownload` function to the `useLocalTranscribe` hook, use the extension spec default ('de') for language initialization, and add missing i18n keys.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Download progress appears as a banner above the ChatInput area, spanning full width
- **D-02:** Banner shows progress bar + percentage + MB (e.g., "45% -- 63 MB / 140 MB")
- **D-03:** Banner includes a cancel button (X) to abort the download. Button returns to idle state on cancel. User can retry by clicking the mic again
- **D-04:** After download completes, banner shows a brief "Ready" confirmation (1-2 seconds), then auto-starts recording
- **D-05:** The banner is only shown during the `downloading` state. Cache loading (`loading` state) does not show the banner -- only a spinner on the button itself
- **D-06:** Language state initializes from the assistant's `defaultLanguage` extension config. Session-only -- resets per page load
- **D-07:** Language options displayed as code only ('de' / 'en') in the dropdown
- **D-08:** Language dropdown is disabled during recording and transcribing states
- **D-09:** On mount: button shows normal mic icon immediately. No visible loading state on mount
- **D-10:** Downloading state: button is disabled while the download banner handles progress visualization
- **D-11:** Recording state: exact match to TranscribeButton -- red filled variant + animate-pulse
- **D-12:** Transcribing state: uses Mantine loading prop on ActionIcon (spinner replaces mic icon, button disabled)
- **D-13:** Error state: button returns to idle. Errors communicated via toast notifications only
- **D-14:** LocalTranscribeButton follows the SpeechRecognitionButton layout -- mic ActionIcon on left + small chevron dropdown on right, wrapped in a Mantine Group
- **D-15:** Download progress banner is a separate DownloadProgressBanner component rendered conditionally in ChatInput, above the textarea
- **D-16:** New component files live in `frontend/src/pages/chat/conversation/` alongside existing buttons

### Claude's Discretion
- ChatInput.tsx wiring details (conditional rendering logic for showing the correct button component)
- Exact Tailwind/CSS classes for the download banner (consistent with existing app styling)
- i18n key naming within the `texts.chat.localTranscribe.*` namespace (some keys already exist from Phase 2)
- Accessibility label text and ARIA roles for new components
- Internal prop interfaces for LocalTranscribeButton and DownloadProgressBanner

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | LocalTranscribeButton zeigt Mikrofon-Icon mit Recording-Status (idle/recording/transcribing) | Hook exposes `state`, `isRecording`, `isTranscribing`, `isDownloading`. Button renders different visual states per D-09 through D-13. Pattern verified in TranscribeButton.tsx and SpeechRecognitionButton.tsx |
| UI-02 | Button pulsiert rot waehrend der Aufnahme (wie bestehender TranscribeButton) | TranscribeButton uses `variant={isRecording ? 'filled' : 'outline'}`, `color={isRecording ? 'red' : 'black'}`, `className={isRecording ? 'animate-pulse' : ''}`. Exact replication per D-11 |
| UI-03 | Button zeigt Loading-Spinner waehrend der Transkription (wie bestehender TranscribeButton) | TranscribeButton uses `loading={isTranscribing}` and `disabled={isTranscribing}` on Mantine ActionIcon. Exact replication per D-12 |
| UI-04 | Sprachauswahl-Dropdown (de/en) ist am Button verfuegbar (wie bestehende SpeechRecognitionButton) | SpeechRecognitionButton uses Mantine Group + ActionIcon + Menu + Menu.Dropdown pattern. Language items rendered as Menu.Item with bold for selected. Replicate per D-14 |
| UI-07 | ChatInput.tsx erkennt Extension-Name 'transcribe-local' und zeigt LocalTranscribeButton | `transcribe-local` already in the filter at ChatInput.tsx:181. Need to add `showLocalTranscribe` boolean and extend the conditional chain at line 294-305 |
| MODEL-03 | Fortschrittsanzeige (Progressbar mit Prozent/MB) wird beim Modell-Download angezeigt | Hook exposes `downloadProgress: { loaded, total, percentage }`. DownloadProgressBanner renders Mantine Progress + formatted text per D-01/D-02 |
| MODEL-04 | Bei gecachtem Modell wird Progressbar uebersprungen und Modell direkt geladen | Hook transitions `loading -> idle` (not `downloading`) when model is cached. Banner only renders when `state === 'downloading'` per D-05 |
| I18N-01 | Alle UI-Texte sind in de und en Sprachdateien hinterlegt (texts.chat.localTranscribe) | Existing keys cover error/status messages. New keys needed for: download banner progress text, cancel label, ready confirmation, language dropdown aria labels |
| I18N-02 | Accessibility Labels sind fuer alle interaktiven Elemente vorhanden | aria-label on mic ActionIcon, chevron dropdown, cancel button, language menu items, progress banner. Existing `texts.accessibility.selectLanguage` reusable for dropdown |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Recording button UI | Browser / Client | -- | Pure client-side component rendering; state from useLocalTranscribe hook |
| Download progress display | Browser / Client | -- | Progress data from Web Worker via hook; banner is client-only |
| Language selection | Browser / Client | -- | Session-only state in ChatInput; no server communication |
| Extension detection | Browser / Client | API / Backend | Frontend reads `configuration.extensions` from backend API response; filtering is client-side |
| i18n text rendering | Browser / Client | -- | Static text bundles loaded at build time |
| Accessibility labels | Browser / Client | -- | ARIA attributes rendered client-side |

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @mantine/core | 9.1.0 | UI components (ActionIcon, Menu, Progress, Group) | Project standard; all existing UI uses Mantine | [VERIFIED: frontend/package.json]
| react | ^19.2.5 | Component framework | Project standard | [VERIFIED: frontend/package.json]
| @tabler/icons-react | ^3.41.1 | Icon library (IconMicrophone, IconChevronDown, IconX) | Project standard; all existing icons use Tabler | [VERIFIED: frontend/package.json]
| tailwindcss | (via @tailwindcss/vite) | Utility CSS classes | Project standard; used for spacing, layout, animation | [VERIFIED: frontend/vite.config.ts]

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-toastify | (installed) | Toast notifications for errors | Already used by useLocalTranscribe hook; no additional toast logic needed in UI components | [VERIFIED: useLocalTranscribe.ts imports]
| vitest | 4.1.4 | Unit testing framework | Test new components | [VERIFIED: frontend/package.json]
| @testing-library/react | ^16.3.2 | React testing utilities | Render and query components in tests | [VERIFIED: frontend/package.json]

**No new dependencies required.** Everything needed is already installed.

## Architecture Patterns

### System Architecture Diagram

```
User Click (mic button)
    |
    v
LocalTranscribeButton -----> useLocalTranscribe hook (Phase 2)
    |                              |
    |  state, downloadProgress     |  Worker messages
    |  isRecording, isTranscribing |
    |  toggleRecording             |
    v                              v
ChatInput.tsx <------------- whisper.worker.ts (Phase 2)
    |
    |  state === 'downloading'?
    v
DownloadProgressBanner
    |  cancelDownload --> terminates worker
    |
    v
i18n (texts.chat.localTranscribe.*)
```

Data flow:
1. ChatInput detects `transcribe-local` extension in `configuration.extensions`
2. ChatInput calls `useLocalTranscribe` hook with language and callback
3. LocalTranscribeButton renders based on hook state
4. DownloadProgressBanner renders conditionally when `state === 'downloading'`
5. User interactions (toggle, cancel, language change) flow through hook/state

### Component Responsibilities

| Component | File | Responsibility |
|-----------|------|---------------|
| LocalTranscribeButton | `frontend/src/pages/chat/conversation/LocalTranscribeButton.tsx` | Mic button with language dropdown; visual states for idle/recording/transcribing/downloading |
| DownloadProgressBanner | `frontend/src/pages/chat/conversation/DownloadProgressBanner.tsx` | Full-width progress bar with percentage, MB, cancel button, "Ready" confirmation |
| ChatInput (modified) | `frontend/src/pages/chat/conversation/ChatInput.tsx` | Wires hook, manages language state, conditionally renders button + banner |
| i18n files (modified) | `frontend/src/texts/languages/{en,de}.ts` + `frontend/src/texts/index.ts` | New text keys for banner, cancel, ready, language labels |

### Recommended Project Structure (changes only)

```
frontend/src/
  pages/chat/conversation/
    LocalTranscribeButton.tsx      # NEW - mic button + language dropdown
    DownloadProgressBanner.tsx     # NEW - download progress banner
    ChatInput.tsx                  # MODIFIED - wire hook + render new components
  hooks/
    useLocalTranscribe.ts          # MODIFIED - add cancelDownload function
  texts/
    languages/
      en.ts                       # MODIFIED - add new i18n keys
      de.ts                       # MODIFIED - add new i18n keys
    index.ts                      # MODIFIED - export new text keys
```

### Pattern 1: Button with Language Dropdown (from SpeechRecognitionButton)

**What:** Mantine Group wrapping ActionIcon (mic) + Menu (chevron dropdown) for language selection
**When to use:** For the LocalTranscribeButton layout (D-14)
**Example:**
```typescript
// Source: frontend/src/pages/chat/conversation/SpeechRecognitionButton.tsx
<div className="flex" style={{ width: 'fit-content' }}>
  <Group wrap="nowrap" gap={0} align="stretch">
    <ActionIcon
      variant={isRecording ? 'filled' : 'outline'}
      size="lg"
      color={isRecording ? 'red' : 'black'}
      className={`border-gray-200 ${isRecording ? 'animate-pulse' : ''} rounded-r-none border-r-0`}
      onClick={onToggle}
      disabled={isDisabled}
      loading={isTranscribing}
      aria-label={buttonLabel}
      style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, width: '36px' }}
    >
      <IconMicrophone className="w-4" />
    </ActionIcon>
    <Menu shadow="md" withInitialFocusPlaceholder={false}>
      <Menu.Target>
        <ActionIcon
          variant="outline"
          size="xs"
          className="rounded-l-none"
          disabled={isRecording || isTranscribing}
          aria-label={texts.accessibility.selectLanguage}
          style={{ /* same as SpeechRecognitionButton */ }}
        >
          <IconChevronDown className="w-3" />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown aria-label={texts.accessibility.selectLanguage}>
        {languages.map((lang) => (
          <Menu.Item key={lang} onClick={() => setLanguage(lang)} fw={language === lang ? 'bold' : ''}>
            {lang}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  </Group>
</div>
```

### Pattern 2: Visual State Matching (from TranscribeButton)

**What:** Exact visual state replication for recording and transcribing states
**When to use:** For D-11 and D-12 compliance
**Example:**
```typescript
// Source: frontend/src/pages/chat/conversation/TranscribeButton.tsx
// Recording: variant="filled", color="red", animate-pulse
// Transcribing: loading={true}, disabled={true}
// Idle: variant="outline", color="black"
```

### Pattern 3: Download Progress Banner

**What:** Full-width banner above textarea showing Mantine Progress, percentage, MB, cancel button
**When to use:** When `state === 'downloading'` and `downloadProgress !== null`
**Example:**
```typescript
// Mantine Progress component with aria-label for accessibility
// Source: Mantine docs (https://mantine.dev/core/progress/)
<Progress value={downloadProgress.percentage} aria-label={texts.chat.localTranscribe.downloadProgress} />
```

### Pattern 4: ChatInput Conditional Rendering Extension

**What:** Extending the existing voice button conditional chain
**When to use:** For UI-07 integration
**Example:**
```typescript
// Source: frontend/src/pages/chat/conversation/ChatInput.tsx:294-305
// Current:
// showSpeechToText ? <SpeechRecognitionButton/> : showTranscribe ? <TranscribeButton/> : null
// Extended:
// showSpeechToText ? <SpeechRecognitionButton/> : showTranscribe ? <TranscribeButton/> : showLocalTranscribe ? <LocalTranscribeButton/> : null
```

### Anti-Patterns to Avoid

- **Prop drilling state computation:** Do NOT compute visual state (variant, color, className) in ChatInput and pass as props. Keep state-to-visual mapping inside LocalTranscribeButton, matching how TranscribeButton does it.
- **Creating custom progress bar:** Use Mantine `Progress` component, not a custom div with width%. Mantine handles accessibility (role="progressbar", aria-valuenow) automatically.
- **Duplicating hook state management:** Do NOT add useState for recording/transcribing in ChatInput or the button. Use the hook's returned values directly.
- **Using usePersistentState for local transcribe language:** Decision D-06 specifies session-only state (resets per page load). Use `useState`, not `usePersistentState`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Progress bar | Custom div with calculated width | Mantine `Progress` component | Built-in ARIA support, smooth transitions, theme integration [CITED: https://mantine.dev/core/progress/] |
| Button loading spinner | Custom spinner overlay | ActionIcon `loading` prop | Mantine handles loader color, overlay, and disabled state automatically [CITED: https://mantine.dev/core/action-icon/] |
| Dropdown menu | Custom popover | Mantine `Menu` component | Focus management, keyboard navigation, screen reader support built in [VERIFIED: SpeechRecognitionButton.tsx uses this pattern] |
| Pulse animation | Custom CSS animation | Tailwind `animate-pulse` | Consistent with existing TranscribeButton [VERIFIED: TranscribeButton.tsx] |

**Key insight:** Every UI pattern needed in this phase already exists in the codebase (SpeechRecognitionButton, TranscribeButton). The job is composition and wiring, not invention.

## Common Pitfalls

### Pitfall 1: Cancel Download Without Hook Support

**What goes wrong:** CONTEXT.md D-03 requires a cancel button that aborts the download and returns to idle. The `useLocalTranscribe` hook (Phase 2) does NOT expose a `cancelDownload` function.
**Why it happens:** Phase 2 designed the hook for the complete flow (download -> record -> transcribe) without cancel interruption.
**How to avoid:** Add a `cancelDownload` function to `useLocalTranscribe` that terminates the current worker and creates a new one. The `TranscriberPipeline.instance` in the worker is a singleton that cannot be interrupted mid-download, so terminating the worker is the cleanest approach. The hook should: (1) terminate the worker, (2) clear `pendingRecordRef`, (3) set state to 'idle', (4) create a fresh worker on next interaction. [VERIFIED: whisper.worker.ts uses singleton pipeline pattern]
**Warning signs:** Banner cancel button does nothing or throws; user stuck in downloading state.

### Pitfall 2: DefaultLanguage Not Available from API

**What goes wrong:** D-06 says language should initialize from the admin's `defaultLanguage` extension config. But `ExtensionUserInfoDto` does NOT include the extension's configured `values` (like `defaultLanguage`). Only the spec schema (with `default: 'de'`) is available via `arguments`.
**Why it happens:** Extension arguments (admin-configured values) are server-side only; the chat API exposes spec metadata but not stored values.
**How to avoid:** Use the spec default value ('de') as the initial language. This matches the extension's `default: 'de'` in `local-transcribe.ts`. If finer control is needed later, a backend API change would be required to expose configured argument values. For MVP, hardcoding 'de' or reading from spec default is acceptable. [VERIFIED: ExtensionUserInfoDto.ts does not include values; local-transcribe.ts has default: 'de']
**Warning signs:** Language always defaults to 'de' regardless of admin configuration.

### Pitfall 3: Ready Confirmation Timing (D-04)

**What goes wrong:** The banner should show "Ready" for 1-2 seconds after download completes, then auto-start recording. But the hook transitions directly to recording when `pendingRecordRef` is set (worker posts 'ready' -> hook calls beginRecording).
**Why it happens:** The hook's `handleWorkerMessage` for status 'ready' immediately calls `beginRecording` if `pendingRecordRef` is true, with no delay.
**How to avoid:** Implement the "Ready" confirmation entirely in the UI layer. When the hook transitions from `downloading` to `recording` (which happens immediately via the hook), the DownloadProgressBanner can show a "Ready" state for 1-2 seconds using a local `useState` + `setTimeout` before hiding itself. Alternatively, detect the transition from `isDownloading=true` to `isDownloading=false` in the banner and show confirmation briefly. [VERIFIED: useLocalTranscribe.ts:167-170 shows immediate beginRecording on ready]
**Warning signs:** Banner disappears instantly after download; user has no visual confirmation before recording starts.

### Pitfall 4: Submit Button Disabled State

**What goes wrong:** The chat submit button should be disabled during recording (like existing voice buttons). Currently, the submit button disables when `listening` (speech recognition) is true, but there's no equivalent for local transcribe recording.
**Why it happens:** The submit button's disabled condition at ChatInput.tsx:309 only checks `listening` for voice state.
**How to avoid:** Add the local transcribe's `isRecording` or `isTranscribing` state to the submit button's disabled condition. [VERIFIED: ChatInput.tsx:309]
**Warning signs:** User can submit while recording, causing confusing UX.

### Pitfall 5: Language Dropdown Disabled State Scope

**What goes wrong:** D-08 says the language dropdown should be disabled during recording AND transcribing. But the SpeechRecognitionButton only disables during `listening`.
**Why it happens:** LocalTranscribeButton has more states than SpeechRecognitionButton.
**How to avoid:** Disable the chevron dropdown when `isRecording || isTranscribing || isDownloading`. Also disable during downloading since changing language mid-download makes no sense. [VERIFIED: SpeechRecognitionButton.tsx:52 only disables on listening]
**Warning signs:** User changes language mid-recording or mid-transcription.

## Code Examples

### LocalTranscribeButton Props Interface

```typescript
// Designed to match the hook's return values + ChatInput-managed state
interface LocalTranscribeButtonProps {
  state: LocalTranscribeState;
  isRecording: boolean;
  isTranscribing: boolean;
  isDownloading: boolean;
  onToggle: () => void;
  language: string;
  onLanguageChange: (language: string) => void;
  languages: string[]; // ['de', 'en']
}
```

### DownloadProgressBanner Props Interface

```typescript
interface DownloadProgressBannerProps {
  downloadProgress: DownloadProgress; // { loaded, total, percentage }
  onCancel: () => void;
}
```

### ChatInput Integration Pattern

```typescript
// In ChatInput.tsx, alongside existing voice extension handling:

// 1. Detect local transcribe extension
const showLocalTranscribe = activeVoiceExtension?.name === 'transcribe-local';

// 2. Language state (session-only, per D-06)
const [localTranscribeLanguage, setLocalTranscribeLanguage] = useState<string>('de');

// 3. Hook call (conditional, similar to useTranscribe pattern)
const localTranscribeHook = useLocalTranscribe({
  language: localTranscribeLanguage,
  onTranscriptReceived: setInput,
});

// 4. Render banner above textarea (when downloading)
{showLocalTranscribe && localTranscribeHook.isDownloading && localTranscribeHook.downloadProgress && (
  <DownloadProgressBanner
    downloadProgress={localTranscribeHook.downloadProgress}
    onCancel={localTranscribeHook.cancelDownload}
  />
)}

// 5. Render button in the voice button area
showLocalTranscribe ? (
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
) : null
```

### New i18n Keys Needed

```typescript
// en.ts additions under chat.localTranscribe:
downloadProgress: 'Downloading speech recognition model',
downloadCancelLabel: 'Cancel download',
downloadReady: 'Ready!',
downloadSize: '{{loaded}} MB / {{total}} MB',

// de.ts additions under chat.localTranscribe:
downloadProgress: 'Spracherkennungsmodell wird heruntergeladen',
downloadCancelLabel: 'Download abbrechen',
downloadReady: 'Bereit!',
downloadSize: '{{loaded}} MB / {{total}} MB',
```

### Hook Extension for Cancel Download

```typescript
// Addition to useLocalTranscribe.ts return value:
const cancelDownload = useCallback(() => {
  if (stateRef.current !== 'downloading') return;
  
  // Terminate current worker
  if (workerRef.current) {
    workerRef.current.removeEventListener('message', handleWorkerMessage);
    workerRef.current.terminate();
    workerRef.current = null;
  }
  
  // Reset state
  pendingRecordRef.current = false;
  modelLoadedRef.current = false;
  setDownloadProgress(null);
  setState('idle');
  
  // Create fresh worker for future use
  const worker = new Worker(new URL('../workers/whisper.worker.ts', import.meta.url), { type: 'module' });
  workerRef.current = worker;
  worker.addEventListener('message', handleWorkerMessage);
}, [handleWorkerMessage]);

return {
  state,
  downloadProgress,
  isRecording: state === 'recording',
  isTranscribing: state === 'transcribing',
  isDownloading: state === 'downloading',
  toggleRecording,
  cancelDownload, // NEW
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mantine v7 Progress | Mantine v9 Progress (same API) | Mantine 9.x | No API changes; compound component syntax also available but simple `<Progress value={n} />` works | [VERIFIED: Mantine 9.1.0 installed]
| Custom ARIA on progress bars | Mantine auto-generates role="progressbar" + aria-valuenow | Mantine 7+ | Less manual accessibility code needed | [CITED: Mantine docs on Progress accessibility]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Using spec default 'de' for language initialization is acceptable when admin-configured value is not accessible via API | Pitfalls / Code Examples | Language always defaults to 'de' even if admin set 'en'. Low impact -- user can change via dropdown. If wrong, requires backend API change to expose extension values |
| A2 | Worker termination + recreation is an acceptable cancel mechanism for model download | Pitfalls / Code Examples | If Transformers.js caches partial downloads, terminated downloads may leave corrupt cache entries. Needs testing. If wrong, partial cache must be cleared manually |
| A3 | The "Ready" confirmation (D-04) can be implemented as a UI-only delay using component-local state, without modifying the hook | Pitfalls | If the hook's immediate transition from downloading to recording is too fast for the UI to show "Ready", the brief confirmation may not be visible. Needs testing with actual download completion timing |

## Open Questions (RESOLVED)

1. **Admin-configured defaultLanguage accessibility** — RESOLVED
   - What we know: `ExtensionUserInfoDto` does not include extension `values`. The spec `default` is 'de'. The admin can set either 'de' or 'en'.
   - Resolution: Use 'de' as default for MVP (A1). The dropdown allows users to change the language per session. If admin-configured value is important, a follow-up can add the value to the API response. Accepted tradeoff documented in Plan 01 Task 2.

2. **Cancel download cache behavior** — RESOLVED
   - What we know: Transformers.js uses IndexedDB/Cache API for model caching. Worker termination interrupts the download.
   - Resolution: Accept worker termination approach. Transformers.js handles partial cache gracefully on re-download (resets incomplete entries). If issues arise during manual testing, cancelDownload can be extended to clear cache. Accepted for MVP with manual test verification in Plan 02 checkpoint.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `frontend/vite.config.ts` (test section) |
| Quick run command | `cd frontend && npx vitest run --testPathPattern='LocalTranscribeButton\|DownloadProgressBanner\|ChatInput' --reporter=verbose` |
| Full suite command | `cd frontend && npm run test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | Button shows mic icon with states (idle/recording/transcribing) | unit | `cd frontend && npx vitest run src/pages/chat/conversation/LocalTranscribeButton.ui-unit.spec.tsx` | Wave 0 |
| UI-02 | Button pulses red during recording | unit | Same as UI-01 | Wave 0 |
| UI-03 | Button shows loading spinner during transcribing | unit | Same as UI-01 | Wave 0 |
| UI-04 | Language dropdown with de/en options | unit | Same as UI-01 | Wave 0 |
| UI-07 | ChatInput shows LocalTranscribeButton for transcribe-local extension | unit | `cd frontend && npx vitest run src/pages/chat/conversation/ChatInput.ui-unit.spec.tsx` | Existing (needs extension) |
| MODEL-03 | Progress bar with percentage/MB during download | unit | `cd frontend && npx vitest run src/pages/chat/conversation/DownloadProgressBanner.ui-unit.spec.tsx` | Wave 0 |
| MODEL-04 | Progress bar skipped when model cached | unit | Same as MODEL-03 (test that banner does not render when state !== 'downloading') | Wave 0 |
| I18N-01 | All UI texts in de and en | unit | Check text keys exist in both language files | Wave 0 |
| I18N-02 | Accessibility labels on interactive elements | unit | Check aria-label rendered on all interactive elements | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd frontend && npx vitest run --testPathPattern='LocalTranscribeButton|DownloadProgressBanner|ChatInput' --reporter=verbose`
- **Per wave merge:** `cd frontend && npm run test`
- **Phase gate:** Full frontend suite green before verification

### Wave 0 Gaps
- [ ] `frontend/src/pages/chat/conversation/LocalTranscribeButton.ui-unit.spec.tsx` -- covers UI-01, UI-02, UI-03, UI-04, I18N-02
- [ ] `frontend/src/pages/chat/conversation/DownloadProgressBanner.ui-unit.spec.tsx` -- covers MODEL-03, MODEL-04
- [ ] `frontend/src/pages/chat/conversation/ChatInput.ui-unit.spec.tsx` -- EXISTING, needs new test cases for UI-07

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A (no auth in this phase) |
| V3 Session Management | no | N/A |
| V4 Access Control | no | Extension visibility controlled by backend (already handled) |
| V5 Input Validation | no | No user text input; language selection from fixed enum ['de', 'en'] |
| V6 Cryptography | no | N/A |

This phase has no security-sensitive operations. All components are presentational, language selection is from a fixed set, and the cancel operation only terminates a local web worker.

## Sources

### Primary (HIGH confidence)
- `frontend/src/pages/chat/conversation/SpeechRecognitionButton.tsx` -- layout pattern template (read in full)
- `frontend/src/pages/chat/conversation/TranscribeButton.tsx` -- visual state pattern template (read in full)
- `frontend/src/pages/chat/conversation/ChatInput.tsx` -- integration point (read in full, 337 lines)
- `frontend/src/hooks/useLocalTranscribe.ts` -- hook API contract (read in full, 302 lines)
- `frontend/src/workers/whisper.worker.ts` -- worker message protocol (read in full)
- `frontend/src/texts/languages/en.ts` / `de.ts` -- existing i18n keys (read relevant sections)
- `backend/src/extensions/other/local-transcribe.ts` -- extension spec with defaultLanguage (read in full)
- `backend/src/controllers/extensions/dtos/index.ts` -- ExtensionUserInfoDto.fromDomain (read relevant sections)
- `frontend/src/api/generated/models/ExtensionUserInfoDto.ts` -- frontend DTO type (read in full)
- Mantine Progress component docs (via Context7: /mantinedev/mantine, topic "Progress")
- Mantine ActionIcon loading prop docs (via Context7: /mantinedev/mantine, topic "ActionIcon loading")

### Secondary (MEDIUM confidence)
- None

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and used in project, versions verified against package.json
- Architecture: HIGH -- all patterns verified from existing codebase components, integration points confirmed line-by-line
- Pitfalls: HIGH -- all pitfalls verified by reading actual source code, especially hook limitations (no cancelDownload) and API gaps (no values in ExtensionUserInfoDto)

**Research date:** 2026-05-07
**Valid until:** 2026-06-07 (stable; no external dependency changes expected)
