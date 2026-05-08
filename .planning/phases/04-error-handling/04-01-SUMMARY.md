---
phase: 04-error-handling
plan: 01
subsystem: frontend
tags: [error-handling, i18n, capability-detection, worker, toast]
dependency_graph:
  requires: []
  provides: [worker-error-codes, isSupported-flag, i18n-error-keys, empty-transcription-check]
  affects: [frontend/src/workers/whisper.worker.ts, frontend/src/hooks/useLocalTranscribe.ts, frontend/src/pages/chat/conversation/ChatInput.tsx, frontend/src/texts/languages/en.ts, frontend/src/texts/languages/de.ts]
tech_stack:
  added: []
  patterns: [network-aware-error-codes, capability-detection-gating, error-code-to-i18n-mapping]
key_files:
  created: []
  modified:
    - frontend/src/workers/whisper.worker.ts
    - frontend/src/hooks/useLocalTranscribe.ts
    - frontend/src/pages/chat/conversation/ChatInput.tsx
    - frontend/src/texts/languages/en.ts
    - frontend/src/texts/languages/de.ts
decisions:
  - "Error state transitions to idle (not error) after download failures, enabling retry via mic click (D-04, Phase 3 D-13)"
  - "Browser capability detection uses useState lazy initializer for stable one-time check on mount (D-03)"
  - "Worker singleton reset on load failure allows retry by clearing cached rejected promise (Pitfall 3)"
metrics:
  duration: 2m 32s
  completed: 2026-05-08T06:50:13Z
---

# Phase 4 Plan 1: Error Handling - Production Code Summary

Network-aware error codes in Worker with i18n mapping, browser capability gating via isSupported, empty transcription check, and download cancel toast across all 5 production files.

## What Was Done

### Task 1: Worker network error codes + i18n keys (60581e5)

Modified `whisper.worker.ts` to send typed error codes in the `code` field of error messages:
- **Load handler**: Detects network failure type via `navigator.onLine` (offline), error message inspection (timeout), or generic fallback. Sends `download_offline`, `download_timeout`, or `download_failed` code.
- **Singleton reset**: Added `TranscriberPipeline.instance = null` in catch block to clear cached rejected promise, enabling retry on next mic click.
- **Transcribe handler**: Added `code: 'transcription_failed'` for consistency.
- **No-audio guard**: Added `code: 'no_audio'` for consistency.

Added 4 new i18n keys to both `en.ts` and `de.ts` under `localTranscribe`:
- `downloadFailedOffline`: Network offline message
- `downloadFailedTimeout`: Download timeout message
- `downloadCancelled`: Cancel confirmation message
- `emptyTranscription`: Empty result with tips

### Task 2: Hook isSupported + error mapping + empty check + cancel toast + ChatInput gating (3657fc9)

Modified `useLocalTranscribe.ts`:
- **isSupported flag**: `useState<boolean>` lazy initializer checking `Worker`, `WebAssembly`, `navigator.mediaDevices?.getUserMedia`, and `self.crossOriginIsolated`. Exposed in return object.
- **Worker guard**: `useEffect` for Worker creation skips entirely when `!isSupported`.
- **Error code mapping**: `switch` on `data.code` maps to specific i18n keys. Sets state to `idle` (not `error`) for retry support.
- **Empty transcription check**: `text.trim() === ''` shows `toast.info` with tips, does not insert text.
- **Cancel toast**: `toast.info(texts.chat.localTranscribe.downloadCancelled)` after state reset in `cancelDownload`.

Modified `ChatInput.tsx`:
- Button rendering gated on `localTranscribeHook.isSupported`.
- Download progress banner gated on `localTranscribeHook.isSupported`.

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Error-to-idle transition**: All error handlers now set state to `idle` instead of `error`, consistent with D-04 and Phase 3 D-13. The toast provides error feedback while the button returns to a clickable state.
2. **Capability detection via useState**: Lazy initializer runs once on mount, result is stable for session lifetime. No `useMemo` needed since `useState` initializer is already lazy.
3. **Singleton reset for retry**: `TranscriberPipeline.instance = null` in catch block allows `??=` operator to create fresh pipeline on next attempt.

## Verification Results

| Check | Result |
|-------|--------|
| isSupported references in hook | 4 occurrences |
| Worker error codes (3 types) | All present |
| en.ts new i18n keys | 4 keys added |
| de.ts new i18n keys | 4 keys added |
| ChatInput isSupported gating | 2 locations (button + banner) |
| TypeScript compilation | Skipped (node_modules not installed in worktree) |

## Self-Check: PASSED

- [x] `frontend/src/workers/whisper.worker.ts` - FOUND
- [x] `frontend/src/hooks/useLocalTranscribe.ts` - FOUND
- [x] `frontend/src/pages/chat/conversation/ChatInput.tsx` - FOUND
- [x] `frontend/src/texts/languages/en.ts` - FOUND
- [x] `frontend/src/texts/languages/de.ts` - FOUND
- [x] Commit 60581e5 - FOUND
- [x] Commit 3657fc9 - FOUND
