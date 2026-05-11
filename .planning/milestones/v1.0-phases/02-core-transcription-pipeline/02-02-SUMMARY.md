---
phase: 02-core-transcription-pipeline
plan: 02
subsystem: frontend
tags: [react-hook, state-machine, web-worker, media-recorder, audio-pipeline, i18n, transferable]

requires:
  - phase: 02-core-transcription-pipeline
    plan: 01
    provides: whisper.worker.ts (Worker message protocol), audio-utils.ts (resampleToMono16kHz)
provides:
  - useLocalTranscribe React hook orchestrating Worker + MediaRecorder + resampling + state machine
  - i18n keys for local transcription in en.ts and de.ts
  - texts/index.ts load() entries for TypeScript type resolution
affects: [02-03-PLAN]

tech-stack:
  added: []
  patterns: [ref-based stable useCallback for Worker message handler, stateRef pattern for latest-state access in closures, beginRecordingRef for dependency-free Worker handler]

key-files:
  created:
    - frontend/src/hooks/useLocalTranscribe.ts
    - frontend/src/hooks/useLocalTranscribe.ui-unit.spec.ts
  modified:
    - frontend/src/texts/languages/en.ts
    - frontend/src/texts/languages/de.ts
    - frontend/src/texts/index.ts

key-decisions:
  - "Used stateRef pattern (useRef synced via useEffect) to access latest state inside useCallback with empty dependency array -- avoids Worker useEffect re-mount on state changes"
  - "Stored beginRecording in a ref (beginRecordingRef) to break circular dependency chain: handleWorkerMessage -> beginRecording -> cleanup -> handleWorkerMessage would cause infinite Worker re-initialization"
  - "Added localTranscribe entries to texts/index.ts load() function -- this is the actual TypeScript type source for texts object, not just the language files"
  - "Used class-based mocks with eslint-disable for no-this-alias in test file -- required for MockMediaRecorderClass constructor to expose instance to test helpers"

patterns-established:
  - "Stable Worker message handler pattern: useCallback with empty deps, all mutable state accessed via refs"
  - "beginRecordingRef pattern: store async callback in ref to decouple Worker message handler from recording lifecycle"
  - "Test mock pattern for MediaRecorder: class-based mock with global instance reference for test verification"

requirements-completed: [AUDIO-01, AUDIO-03, AUDIO-04, MODEL-01, MODEL-02]

duration: 10min
completed: 2026-05-07
---

# Phase 2 Plan 02: useLocalTranscribe Hook Summary

**React hook orchestrating full local transcription pipeline: Worker lifecycle, model download/cache pre-load, MediaRecorder audio capture, 16kHz resampling, Transferable transfer, 6-state machine, and 2-minute auto-stop with toast notifications**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-07T17:40:27Z
- **Completed:** 2026-05-07T17:51:20Z
- **Tasks:** 2
- **Files created:** 2
- **Files modified:** 3

## Accomplishments

- useLocalTranscribe hook implementing the complete audio transcription pipeline with 6-state machine (idle, downloading, loading, recording, transcribing, error)
- Worker instantiation on mount with model pre-load from cache (D-06) and on-demand download on first click (D-04, D-05)
- MediaRecorder audio capture with 100ms timeslice, resampling via resampleToMono16kHz, and Transferable zero-copy transfer to Worker (AUDIO-03)
- 2-minute auto-stop with toast notification (D-11, AUDIO-04), download progress reporting (D-08), language pass-through (D-09), callback delivery (D-10)
- i18n keys for local transcription added to en.ts, de.ts, and texts/index.ts (12 keys in each language)
- 13 unit tests covering state machine transitions, Worker orchestration, MediaRecorder lifecycle, auto-stop, Transferable transfer, cleanup, and error handling

## Task Commits

Each task was committed atomically:

1. **Task 1: Add localTranscribe i18n keys to en.ts and de.ts** - `2bd7dc8` (feat)
2. **Task 2 RED: Failing tests for useLocalTranscribe hook** - `10a4ee5` (test)
3. **Task 2 GREEN: Implement useLocalTranscribe hook** - `8022c7c` (feat)

## TDD Gate Compliance

- RED gate: `10a4ee5` (test commit -- tests fail because hook does not exist)
- GREEN gate: `8022c7c` (feat commit -- all 13 tests pass)
- REFACTOR: No separate refactor needed -- code was clean after GREEN phase

## Files Created/Modified

- `frontend/src/hooks/useLocalTranscribe.ts` - React hook with full pipeline orchestration: Worker init, model lifecycle, MediaRecorder, resampling, Transferable transfer, state machine, timer
- `frontend/src/hooks/useLocalTranscribe.ui-unit.spec.ts` - 13 unit tests with mocked Worker, MediaRecorder, getUserMedia, toast, and fake timers
- `frontend/src/texts/languages/en.ts` - Added localTranscribe block with 12 English i18n keys
- `frontend/src/texts/languages/de.ts` - Added localTranscribe block with 12 German i18n keys
- `frontend/src/texts/index.ts` - Added localTranscribe entries to load() function for TypeScript type resolution

## Decisions Made

- Used stateRef pattern (useRef synced via useEffect) instead of including state in useCallback dependency arrays. This prevents the Worker initialization useEffect from re-running on every state change, which would terminate and recreate the Worker.
- Stored beginRecording in a ref (beginRecordingRef) to break the circular dependency: handleWorkerMessage -> beginRecording -> cleanup. Without this, handleWorkerMessage would change on every render, causing the Worker useEffect to remount.
- Discovered that texts/index.ts has a manually constructed load() function -- the TypeScript types for `texts.chat.localTranscribe` come from this function, NOT from en.ts directly. Added all 12 localTranscribe keys to the load() function.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created node_modules symlinks for worktree**
- **Found during:** Setup
- **Issue:** Worktree directory lacked node_modules, preventing vitest and eslint from resolving dependencies
- **Fix:** Created symlinks from worktree to main repo's node_modules for both root and frontend
- **Verification:** vitest and eslint run successfully from worktree directory

**2. [Rule 2 - Missing functionality] Added localTranscribe to texts/index.ts load() function**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** texts.chat.localTranscribe was not a valid property because the texts object type is derived from the load() function in texts/index.ts, not directly from en.ts
- **Fix:** Added all 12 localTranscribe translate() entries to the load() function
- **Files modified:** frontend/src/texts/index.ts
- **Commit:** 8022c7c

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing functionality)
**Impact on plan:** Both fixes were necessary for correct operation. The texts/index.ts change ensures TypeScript type safety for texts.chat.localTranscribe references.

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness

- useLocalTranscribe hook is ready for Phase 3 (02-03-PLAN) to wire into ChatInput.tsx
- Hook API: `useLocalTranscribe({ language, onTranscriptReceived, maxDurationMs? })` returns `{ state, downloadProgress, isRecording, isTranscribing, isDownloading, toggleRecording }`
- i18n keys available at `texts.chat.localTranscribe.*` for UI text rendering
- All state machine states (idle, downloading, loading, recording, transcribing, error) are exposed for Phase 3 to render distinct UI per state

## Self-Check: PASSED

All files exist:
- FOUND: frontend/src/hooks/useLocalTranscribe.ts
- FOUND: frontend/src/hooks/useLocalTranscribe.ui-unit.spec.ts

All commits verified:
- FOUND: 2bd7dc8 (i18n keys)
- FOUND: 10a4ee5 (TDD RED)
- FOUND: 8022c7c (TDD GREEN)

SUMMARY.md created at .planning/phases/02-core-transcription-pipeline/02-02-SUMMARY.md

---
*Phase: 02-core-transcription-pipeline*
*Completed: 2026-05-07*
