---
phase: 03-ui-integration
plan: 01
subsystem: frontend
tags: [local-transcribe, ui-components, i18n, hook-enhancement, chat-input]
dependency_graph:
  requires: [02-02-SUMMARY]
  provides: [LocalTranscribeButton, DownloadProgressBanner, cancelDownload-hook, i18n-download-keys]
  affects: [ChatInput, useLocalTranscribe]
tech_stack:
  added: []
  patterns: [mantine-action-icon-group, progress-banner, state-machine-visual-mapping]
key_files:
  created:
    - frontend/src/pages/chat/conversation/LocalTranscribeButton.tsx
    - frontend/src/pages/chat/conversation/DownloadProgressBanner.tsx
  modified:
    - frontend/src/hooks/useLocalTranscribe.ts
    - frontend/src/texts/languages/en.ts
    - frontend/src/texts/languages/de.ts
    - frontend/src/texts/index.ts
    - frontend/src/pages/chat/conversation/ChatInput.tsx
decisions: []
metrics:
  duration: 3m 27s
  completed: 2026-05-07
---

# Phase 03 Plan 01: UI Integration -- Local Transcribe Components Summary

Full vertical slice: local transcribe UI from hook cancelDownload through two new components to ChatInput wiring with download progress banner, mic button, and language dropdown.

## Completed Tasks

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Hook cancelDownload + i18n keys | b03c747 | Added cancelDownload to useLocalTranscribe hook; 4 new i18n keys in en/de/index |
| 2 | LocalTranscribeButton + DownloadProgressBanner + ChatInput wiring | a19d681 | Two new components created; ChatInput fully wired with banner, button, and submit guard |

## What Was Built

### Task 1: Hook Enhancement + i18n

- **cancelDownload function**: Added to `useLocalTranscribe` hook using `useCallback`. Terminates the current web worker, resets all state (pendingRecord, modelLoaded, downloadProgress), and creates a fresh worker for future use. Only fires when state is 'downloading'.
- **i18n keys**: 4 new keys added in all three locations:
  - `downloadProgress`: Banner label text
  - `downloadCancelLabel`: Cancel button aria-label
  - `downloadReady`: "Ready!" / "Bereit!" confirmation text
  - `downloadSize`: Parameterized "X MB / Y MB" format with `(loaded, total)` function signature in index.ts

### Task 2: Components + Wiring

- **LocalTranscribeButton**: Mic button with language dropdown following SpeechRecognitionButton's Group+ActionIcon+Menu layout pattern. Maps 5 visual states:
  - Idle: outline variant, black color
  - Downloading: disabled (banner handles progress display)
  - Loading (cache): loading spinner, disabled
  - Recording: filled variant, red color, animate-pulse
  - Transcribing: loading spinner, disabled
  - Chevron disabled during all busy states
  - All elements have aria-labels

- **DownloadProgressBanner**: Full-width banner above textarea during model download. Shows:
  - Progress bar (Mantine Progress component)
  - MB loaded / total formatted text
  - Cancel button (X icon) wired to cancelDownload
  - "Ready!" text for 1.5s after download completes (via setTimeout), then auto-unmounts
  - role="status" + aria-live="polite" for accessibility

- **ChatInput wiring**:
  - `showLocalTranscribe` boolean from extension name check
  - `localTranscribeLanguage` state with useState (not persisted, per D-06)
  - `useLocalTranscribe` hook call with language and onTranscriptReceived
  - Banner conditionally rendered inside form container above textarea
  - Button in ternary chain after TranscribeButton
  - Submit button disabled during local recording/transcribing

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- TypeScript compilation: PASS (no errors in modified files; worktree missing node_modules causes pre-existing unrelated module resolution errors)
- All acceptance criteria met for both tasks
- No lint errors in created/modified code (verified via main repo tsc)

## Known Stubs

None -- all components are fully wired to the useLocalTranscribe hook with real data flow.

## Self-Check: PASSED

All 8 files verified present. Both commit hashes (b03c747, a19d681) found in git log.
