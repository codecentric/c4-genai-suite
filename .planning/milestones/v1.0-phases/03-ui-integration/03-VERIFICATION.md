---
phase: 03-ui-integration
verified: 2026-05-08T06:40:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Verify full local transcription UI flow in a live browser"
    expected: "Download flow, ready confirmation, recording states, language switching, and cached model behavior all work as specified"
    why_human: "The human verification checkpoint was documented as APPROVED in 03-02-SUMMARY.md (Task 2 sign-off). However, this was self-reported by the executor. The verifier cannot independently confirm the live browser behavior (model download, WebGPU/WASM fallback, transcription quality, language switching output) without a running environment. The fix applied during human verification (fp16 -> q8, whisper-base -> whisper-small) also changes behavior from the original spec and requires human confirmation that the final behavior is acceptable."
---

# Phase 03: UI Integration Verification Report

**Phase Goal:** Users can see and interact with the local transcription feature in the chat interface, including model download progress and language selection
**Verified:** 2026-05-08T06:40:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | When 'transcribe-local' extension is active on an assistant, a microphone button appears in the ChatInput area | VERIFIED | `ChatInput.tsx:191` — `showLocalTranscribe = activeVoiceExtension?.name === 'transcribe-local'`; `ChatInput.tsx:323-334` renders `<LocalTranscribeButton>` in ternary chain |
| 2 | The button shows three distinct visual states: idle (mic icon), recording (pulsing red), and transcribing (spinner) | VERIFIED | `LocalTranscribeButton.tsx:42-55` — `variant={isRecording ? 'filled' : 'outline'}`, `color={isRecording ? 'red' : 'black'}`, `animate-pulse` CSS class, `loading={isTranscribing \|\| isLoading}`; all 5 states implemented and covered by 10 passing unit tests |
| 3 | A progress bar with percentage and MB downloaded appears during first-time model download, and is skipped when model is already cached | VERIFIED | `DownloadProgressBanner.tsx` contains `<Progress value={downloadProgress.percentage}>` and MB text via `downloadSize()`; `ChatInput.tsx:246` gates banner on `isDownloading && downloadProgress` — cached model goes `loading -> ready (idle)` without `progress_total` events, so `isDownloading` is never set and banner never renders |
| 4 | A language dropdown (de/en) is available on the button, and switching language changes the transcription output language | VERIFIED | `LocalTranscribeButton.tsx:77-88` — Mantine Menu renders `languages.map()` items; `ChatInput.tsx:201-204` passes `localTranscribeLanguage` to hook; `useLocalTranscribe.ts:237` — `language: languageRef.current` passed to worker `postMessage` on transcription |
| 5 | All UI text is available in both German and English, and all interactive elements have accessibility labels | VERIFIED | 4 new i18n keys (`downloadProgress`, `downloadCancelLabel`, `downloadReady`, `downloadSize`) present in both `en.ts` (line 204-207) and `de.ts` (line 208-211) and `texts/index.ts` (lines 234-237); `aria-label` on mic button, chevron button (using `texts.accessibility.selectLanguage`), cancel button, progress bar; `role="status"` + `aria-live="polite"` on banner |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/pages/chat/conversation/LocalTranscribeButton.tsx` | Mic button with language dropdown and visual state mapping | VERIFIED | 92 lines, exports `LocalTranscribeButton`, implements all 5 states (idle/downloading/loading/recording/transcribing) |
| `frontend/src/pages/chat/conversation/DownloadProgressBanner.tsx` | Download progress banner with cancel and ready confirmation | VERIFIED | 65 lines, exports `DownloadProgressBanner`, Progress bar, cancel button, "Ready!" state, `role="status"` |
| `frontend/src/hooks/useLocalTranscribe.ts` | `cancelDownload` function in hook return | VERIFIED | Lines 285-305: `cancelDownload = useCallback(...)` exists; line 324: included in return object |
| `frontend/src/texts/languages/en.ts` | English i18n keys including `downloadProgress` | VERIFIED | Lines 204-207: all 4 new keys present with correct English values |
| `frontend/src/texts/languages/de.ts` | German i18n keys including `downloadProgress` | VERIFIED | Lines 208-211: all 4 new keys present with correct German translations |
| `frontend/src/texts/index.ts` | TypeScript type entries for new i18n keys | VERIFIED | Lines 234-237: all 4 keys typed, `downloadSize` uses parameterized function `(loaded: string, total: string) =>` |
| `frontend/src/pages/chat/conversation/LocalTranscribeButton.ui-unit.spec.tsx` | Unit tests for LocalTranscribeButton (min 80 lines) | VERIFIED (minor) | 79 lines (1 short of plan minimum), 10 `it()` test cases covering all 5 states + chevron disabled states + aria-labels — all pass |
| `frontend/src/pages/chat/conversation/DownloadProgressBanner.ui-unit.spec.tsx` | Unit tests for DownloadProgressBanner (min 60 lines) | VERIFIED (minor) | 52 lines (8 short of plan minimum), 6 `it()` test cases covering all specified behaviors — all pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ChatInput.tsx` | `useLocalTranscribe.ts` | `useLocalTranscribe` hook call | WIRED | `ChatInput.tsx:9` import; `ChatInput.tsx:201-204` hook call with `language` and `onTranscriptReceived` |
| `ChatInput.tsx` | `LocalTranscribeButton.tsx` | conditional rendering in ternary chain | WIRED | `ChatInput.tsx:14` import; `ChatInput.tsx:191+323-334` — `showLocalTranscribe ? <LocalTranscribeButton ...>` |
| `ChatInput.tsx` | `DownloadProgressBanner.tsx` | conditional rendering when downloading | WIRED | `ChatInput.tsx:11` import; `ChatInput.tsx:246-252` — `showLocalTranscribe && isDownloading && downloadProgress && <DownloadProgressBanner>` |
| `LocalTranscribeButton.tsx` | `texts/index.ts` | `texts.chat.localTranscribe.*` imports | WIRED | `LocalTranscribeButton.tsx:4` — `import { texts } from 'src/texts'`; uses `texts.chat.localTranscribe.transcribing`, `.stopRecording`, `.downloadingModel`, `.loadingModel`, `.startRecording`; uses `texts.accessibility.selectLanguage` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `DownloadProgressBanner.tsx` | `downloadProgress` | `useLocalTranscribe.ts:setDownloadProgress()` called on `progress_total` worker messages | Yes — real bytes from Transformers.js worker | FLOWING |
| `LocalTranscribeButton.tsx` | `state`, `isRecording`, `isTranscribing`, `isDownloading` | `useLocalTranscribe.ts` state machine driven by worker messages | Yes — real state machine, not hardcoded | FLOWING |
| `ChatInput.tsx` | `localTranscribeHook.*` | `useLocalTranscribe` hook return (line 317-325) | Yes — returns live state, not stubs | FLOWING |

### Behavioral Spot-Checks

Tests run in-process (vitest):

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| LocalTranscribeButton renders 10 test cases covering 5 states | `npx vitest run LocalTranscribeButton.ui-unit.spec.tsx` | 10/10 pass | PASS |
| DownloadProgressBanner renders 6 test cases | `npx vitest run DownloadProgressBanner.ui-unit.spec.tsx` | 6/6 pass | PASS |
| TypeScript compiles without errors in Phase 3 files | `npx tsc --noEmit` | 0 errors in Phase 3 files; 1 pre-existing error in `useTranscribe.ts` (not Phase 3) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| UI-01 | 03-01-PLAN, 03-02-PLAN | LocalTranscribeButton shows mic icon with recording status | SATISFIED | `LocalTranscribeButton.tsx` implements idle/recording/transcribing states; unit tests verify |
| UI-02 | 03-01-PLAN, 03-02-PLAN | Button pulses red during recording | SATISFIED | `LocalTranscribeButton.tsx:45` — `animate-pulse` CSS class; `color={isRecording ? 'red' : 'black'}`; unit test at line 25-30 verifies |
| UI-03 | 03-01-PLAN, 03-02-PLAN | Button shows loading spinner during transcription | SATISFIED | `LocalTranscribeButton.tsx:48` — `loading={isTranscribing \|\| isLoading}`; unit test verifies disabled state |
| UI-04 | 03-01-PLAN, 03-02-PLAN | Language dropdown (de/en) on button | SATISFIED | `LocalTranscribeButton.tsx:77-88` — Mantine Menu with `languages.map()`; `ChatInput.tsx:332` passes `['de', 'en']` |
| UI-07 | 03-01-PLAN, 03-02-PLAN | ChatInput recognizes 'transcribe-local' and shows LocalTranscribeButton | SATISFIED | `ChatInput.tsx:186` — `e.name === 'transcribe-local'` in filter; `ChatInput.tsx:191` — `showLocalTranscribe` boolean |
| MODEL-03 | 03-01-PLAN, 03-02-PLAN | Progress bar with percentage/MB shown during model download | SATISFIED | `DownloadProgressBanner.tsx:44-47` — `<Progress value={downloadProgress.percentage}>`; MB text via `downloadSize()` |
| MODEL-04 | 03-01-PLAN, 03-02-PLAN | Cached model skips progress bar | SATISFIED | `ChatInput.tsx:246` — banner gated on `isDownloading && downloadProgress`; cached model transitions `loading -> ready (idle)` without `progress_total` events, so banner never renders |
| I18N-01 | 03-01-PLAN | All UI texts in de and en language files | SATISFIED | `en.ts:204-207` and `de.ts:208-211` contain all 4 new keys plus pre-existing keys; `texts/index.ts:234-237` types them |
| I18N-02 | 03-01-PLAN, 03-02-PLAN | Accessibility labels on all interactive elements | SATISFIED | Mic button: `aria-label={getButtonLabel()}`; chevron: `aria-label={texts.accessibility.selectLanguage}`; cancel button: `aria-label={texts.chat.localTranscribe.downloadCancelLabel}`; progress bar: `aria-label={texts.chat.localTranscribe.downloadProgress}`; banner container: `role="status"` + `aria-live="polite"` |

All 9 Phase 3 requirements from REQUIREMENTS.md are satisfied. No orphaned Phase 3 requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `DownloadProgressBanner.tsx` | 28 | `return null` | Info | Correct: guard for when banner is no longer visible after ready confirmation timer. Not a stub — it's intentional unmounting behavior. |

No blockers found. The `return null` in DownloadProgressBanner is correct logic (banner unmounts after 1.5s "Ready!" display), not a stub.

### Human Verification Required

#### 1. Live Browser UI Flow Confirmation

**Test:** Start the dev server (`npm run dev`), configure an assistant with 'transcribe-local' extension, open a chat with that assistant, and verify:
- Mic button with chevron dropdown appears in ChatInput
- Clicking mic triggers model download with progress banner (first time)
- Cancel button aborts download and returns to idle
- After download: "Ready!" appears briefly then recording starts (auto-start behavior, D-04)
- Mic button turns red + pulses during recording
- Spinner appears on button during transcription
- Transcribed text appears in textarea
- Language dropdown switches between 'de' and 'en', affecting transcription output
- Second use (cached model) shows no download banner, just brief loading spinner then recording

**Expected:** All behaviors work as described in the UI-SPEC.

**Why human:** Runtime behavior involving Web Workers, WebGPU/WASM fallback, actual model download from Hugging Face Hub, MediaRecorder API, and audio resampling cannot be verified statically. The executor noted fixes applied during live testing (whisper-small q8 instead of whisper-base fp16) — the summary documents these as APPROVED but independent confirmation is required.

**Note:** The SUMMARY documents Task 2 human verification as "APPROVED" with fixes noted. If the development team accepts the executor's self-reported human verification, this item can be marked resolved.

---

## Gaps Summary

No automated gaps found. All 5 roadmap success criteria verified. All 9 Phase 3 requirements satisfied. All artifacts exist, are substantive, and are wired with real data flowing through.

The single `human_needed` item relates to runtime behavior that cannot be verified programmatically. The executor documented human approval in 03-02-SUMMARY.md; independent verification of the live browser flow is recommended before closing the phase.

---

_Verified: 2026-05-08T06:40:00Z_
_Verifier: Claude (gsd-verifier)_
