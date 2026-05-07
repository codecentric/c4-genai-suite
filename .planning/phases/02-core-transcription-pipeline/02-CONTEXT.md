# Phase 2: Core Transcription Pipeline - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the end-to-end local transcription pipeline: audio capture via MediaRecorder, resampling to 16kHz mono Float32Array, Web Worker with Whisper inference via Transformers.js, and model download/caching. The deliverable is a `useLocalTranscribe` React hook that Phase 3 consumes — no UI is built in this phase.

</domain>

<decisions>
## Implementation Decisions

### Model Variant & Quantization
- **D-01:** Use `onnx-community/whisper-base` from HuggingFace as the model repository.
- **D-02:** Quantization level is `fp16` for both encoder and decoder. No mixed quantization. Total download ~145MB.
- **D-03:** No version pinning — use latest revision from the model repo. Model format is stable.

### Model Loading Trigger
- **D-04:** First-time download starts when user clicks record for the first time (not on hook mount). User sees progress bar during download, then recording begins automatically.
- **D-05:** Before recording starts, the model must be fully loaded. No parallel recording during download — if download fails, no audio is wasted.
- **D-06:** On subsequent uses (model cached in IndexedDB): pre-load model from cache on hook mount. This makes recording instant on click after the first use.

### Hook API Contract
- **D-07:** Hook exposes extended state machine: `idle | downloading | loading | recording | transcribing | error`. Phase 3 can render distinct UI per state.
- **D-08:** Download progress exposed as object: `{ loaded: number, total: number, percentage: number }`. Transformers.js already reports loaded/total bytes — pass through directly.
- **D-09:** Language passed as parameter to hook: `useLocalTranscribe({ language: 'de', ... })`. Hook doesn't read extension config directly — Phase 3 manages language state.
- **D-10:** Callback pattern matches existing hook: `onTranscriptReceived: (transcript: string) => void`.

### Recording Behavior
- **D-11:** Auto-stop at 2 minutes shows a toast notification, consistent with existing `useTranscribe` hook pattern.

### Claude's Discretion
- Worker communication protocol (message types, error shapes)
- Web Worker lifecycle (singleton vs per-use)
- Audio resampling implementation details (OfflineAudioContext approach)
- WebGPU detection and WASM fallback strategy
- Internal Worker error handling and retry behavior

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Transcription Pattern
- `frontend/src/hooks/useTranscribe.ts` — Existing cloud transcription hook. Reference for state machine, MediaRecorder usage, recording flow, cleanup patterns, and toast notifications.
- `frontend/src/pages/chat/conversation/ChatInput.tsx` §179-193 — Extension name recognition and hook wiring. Already filters for `transcribe-local` but no local hook wired up yet.

### Extension System
- `backend/src/extensions/other/local-transcribe.ts` — Phase 1 extension with `defaultLanguage` config field (select: de/en).

### Transformers.js
- `onnx-community/whisper-base` (HuggingFace) — ONNX model repo with fp16 variants for encoder and decoder.

### Project Requirements
- `.planning/REQUIREMENTS.md` §Web Worker & Pipeline — WORK-01 to WORK-05
- `.planning/REQUIREMENTS.md` §Audio-Verarbeitung — AUDIO-01 to AUDIO-04
- `.planning/REQUIREMENTS.md` §Modell-Management — MODEL-01, MODEL-02

### Phase 1 Context
- `.planning/phases/01-infrastructure-backend-extension/01-CONTEXT.md` — Prior decisions on extension config, COOP/COEP scope, and extension registration.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useTranscribe` hook: MediaRecorder setup, cleanup pattern, state machine (idle/recording/transcribing/error), auto-stop timer, toast notifications — all directly reusable as reference for `useLocalTranscribe`.
- `TranscribeState` type exported from `useTranscribe.ts` — extend with `downloading` and `loading` states for local variant.
- Toast text keys under `texts.chat.transcribe.*` — reuse pattern for local transcription messages (add `texts.chat.localTranscribe.*`).

### Established Patterns
- Speech extensions are type `'other'` with empty middlewares — pure markers that the frontend recognizes.
- Recording uses `MediaRecorder` with `audio/webm` MIME type, 100ms timeslice, and blob-based chunking.
- Max duration enforced via `setInterval` timer with toast notification on auto-stop.

### Integration Points
- `ChatInput.tsx:181` — `transcribe-local` is already in the filter, needs `useLocalTranscribe` hook wired up (Phase 3 will do this).
- `frontend/src/hooks/` — New `useLocalTranscribe.ts` hook file alongside existing `useTranscribe.ts`.
- `frontend/src/workers/` — New directory for `whisper.worker.ts` (no workers exist yet in frontend).
- `frontend/src/texts/languages/de.ts` and `en.ts` — i18n keys for download progress, loading, and transcription states.

</code_context>

<specifics>
## Specific Ideas

- The hook should feel like a natural companion to `useTranscribe` — similar interface, extended with model lifecycle states.
- Download progress must expose loaded/total bytes so Phase 3 can show "X MB / Y MB" detail, not just a percentage.
- Pre-loading from cache on mount makes the second-and-beyond experience feel instant — important for user perception.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 2-Core Transcription Pipeline*
*Context gathered: 2026-05-07*
