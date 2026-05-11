# Phase 4: Error Handling - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers graceful failure modes for the local transcription feature: browser compatibility detection (hiding the button on unsupported browsers), network-aware download failure messages with retry via mic button, and meaningful feedback for empty transcription results. All error paths use `react-toastify` toasts and return the button to idle state (Phase 3 D-13).

</domain>

<decisions>
## Implementation Decisions

### Browser Compatibility Detection
- **D-01:** Full capability check before showing the button: `Worker` + `WebAssembly` + `navigator.mediaDevices.getUserMedia` + `self.crossOriginIsolated` (SharedArrayBuffer). All four must be present.
- **D-02:** When any capability is missing, the button **does not render at all** — silent absence. No tooltip, no disabled state, no console warning.
- **D-03:** The `useLocalTranscribe` hook exposes an `isSupported` flag. ChatInput reads it to conditionally render the LocalTranscribeButton. Check runs once on mount.

### Download Failure Retry
- **D-04:** Retry mechanism is **click mic again** — same as normal flow. Error toast appears, button returns to idle (Phase 3 D-13), user clicks mic to retry download. No retry button in toast, no auto-retry.
- **D-05:** **Network-aware error messages** — differentiate between offline/unreachable, timeout, and other failures. Worker needs to detect failure type and send specific error codes. New i18n keys for each failure type.
- **D-06:** Download cancellation (Phase 3 D-03 cancel button) shows a **toast.info** confirming "Download cancelled."

### Empty Transcription Result
- **D-07:** When Whisper returns empty or whitespace-only text: show **toast.info** with helpful message, **do not insert** text into chat input, return to idle.
- **D-08:** Message includes tips: "No speech could be recognized. Try speaking louder or closer to the microphone." (de/en translations needed)

### Claude's Discretion
- Specific browser capability detection implementation (feature detection vs. user-agent sniffing — feature detection preferred)
- Error code schema between Worker and main thread
- Network failure detection approach in the Worker (navigator.onLine, fetch error types, timeout thresholds)
- Exact i18n key naming for new error messages within `texts.chat.localTranscribe.*` namespace
- Whether to trim whitespace before empty check or check for exact empty string

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Error Handling Patterns (existing)
- `frontend/src/hooks/useLocalTranscribe.ts` — Current hook with partial error handling: mic permission (line 108-109), generic worker error (line 181-183), no-audio check (line 212-215). Main file to modify.
- `frontend/src/hooks/useTranscribe.ts` — Cloud transcription hook with error patterns: toast usage, MediaRecorder error handling, browser compatibility check (line 122). Reference for consistent error UX.
- `frontend/src/hooks/useSpeechRecognitionToggle.ts` — Speech recognition hook with browser/mic error patterns (lines 23-50). Reference for capability detection.

### UI Components
- `frontend/src/pages/chat/conversation/LocalTranscribeButton.tsx` — Button component that will need `isSupported` conditional rendering.
- `frontend/src/pages/chat/conversation/ChatInput.tsx` §179-305 — Integration point where `isSupported` check determines whether button renders.

### Worker
- `frontend/src/workers/whisper.worker.ts` — Web Worker that needs network-aware error reporting for download failures.

### i18n
- `frontend/src/texts/languages/en.ts` §191-208 — Existing `localTranscribe` keys including `downloadFailed`, `microphonePermissionDenied`, `noAudioRecorded`. New keys needed for network-specific errors, cancel confirmation, and empty transcription.
- `frontend/src/texts/languages/de.ts` §194-212 — German translations, same structure.

### Project Requirements
- `.planning/REQUIREMENTS.md` §Fehlerbehandlung — ERR-01, ERR-02, ERR-03, ERR-04

### Prior Phase Decisions
- `.planning/phases/03-ui-integration/03-CONTEXT.md` — D-13: error state returns to idle, toast-only errors
- `.planning/phases/02-core-transcription-pipeline/02-CONTEXT.md` — D-07: hook state machine includes `error` state

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `toast.error()` / `toast.info()` from `react-toastify`: established notification pattern used across the app (UserProfileModal, Markdown, PdfViewer, useTranscribe, useSpeechRecognitionToggle)
- `useTranscribe.ts:122` browser support check pattern: `if (!navigator.mediaDevices) { toast.error(...); return; }` — reference for compatibility detection
- Existing i18n keys: `downloadFailed`, `loadFailed`, `microphonePermissionDenied`, `recordingStartFailed`, `noAudioRecorded` — some already used, some need wiring

### Established Patterns
- Error → idle transition (Phase 3 D-13): all hooks follow pattern of toast + return to idle state
- Toast messages include actionable guidance: "Please try again", "Please check your microphone", "Please allow microphone access in your browser settings"
- Worker error communication: `{ status: 'error', error: string }` message format

### Integration Points
- `useLocalTranscribe.ts:176-178` — `result` handler needs empty text check (ERR-04)
- `useLocalTranscribe.ts:181-183` — `error` handler needs download-specific error codes (ERR-03)
- `useLocalTranscribe.ts:188-200` — Worker initialization needs capability check guard (ERR-02)
- `useLocalTranscribe.ts:281` — `cancelDownload` needs toast.info call (D-06)
- `whisper.worker.ts` — needs network-aware error detection and specific error codes

</code_context>

<specifics>
## Specific Ideas

- ERR-01 (mic permission denied) is already fully implemented — no changes needed. Toast says "Microphone permission denied. Please allow microphone access in your browser settings."
- Network-aware download errors should distinguish: offline/unreachable → "No internet connection", timeout → "Download timed out", other → generic "Failed to download". Worker detects the failure type.
- Empty transcription message includes practical tips: "Try speaking louder or closer to the microphone" — helps user self-diagnose.
- Cancel download confirmation toast is `toast.info` not `toast.error` — user chose to cancel, it's not an error.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 4-Error Handling*
*Context gathered: 2026-05-08*
