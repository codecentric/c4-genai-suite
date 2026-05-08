---
phase: 04-error-handling
plan: 02
subsystem: frontend
tags: [testing, error-handling, vitest, hook-tests, worker-tests]
dependency_graph:
  requires: [worker-error-codes, isSupported-flag, i18n-error-keys, empty-transcription-check]
  provides: [error-handling-test-coverage, broken-test-fixes]
  affects: [frontend/src/hooks/useLocalTranscribe.ui-unit.spec.ts, frontend/src/workers/whisper.worker.ui-unit.spec.ts]
tech_stack:
  added: []
  patterns: [worker-error-code-assertions, capability-detection-test-stubs, toast-notification-verification]
key_files:
  created: []
  modified:
    - frontend/src/hooks/useLocalTranscribe.ui-unit.spec.ts
    - frontend/src/workers/whisper.worker.ui-unit.spec.ts
    - frontend/src/hooks/useTranscribe.ts
decisions:
  - "Browser capability stubs (WebAssembly, crossOriginIsolated) added to beforeEach to ensure isSupported=true by default in all tests"
  - "Pre-existing Timeout type error in useTranscribe.ts fixed with window.setInterval to unblock commits (Rule 3)"
metrics:
  duration: 6m 43s
  completed: 2026-05-08T08:42:32Z
---

# Phase 4 Plan 2: Error Handling Test Coverage Summary

Fix 4 broken hook tests and add 16 new test cases covering isSupported gating, error code mapping, empty transcription, cancel toast, Worker network errors, and singleton retry across both test files.

## What Was Done

### Task 1: Fix broken tests + add error handling tests (86a35ac)

**useLocalTranscribe.ui-unit.spec.ts (23 tests total, 10 new):**

Fixed 4 broken tests that assumed mount pre-load behavior:
- Test 1: Changed expected initial state from `'loading'` to `'idle'`, added `isSupported` assertion
- Test 2: Removed `postMessage({ type: 'load' })` assertion, now verifies Worker creation via `addEventListener`
- Test 5: Triggers download via `toggleRecording()` instead of assuming loading-state download events
- Test 13: Tests download-blocks-recording by triggering download first, then verifying toggle is no-op
- Test 3: Updated intermediate assertion from `'error'` to `'idle'` for error-then-retry flow
- Test 11: Updated to verify error code mapping (`download_offline` -> i18n key), state `'idle'` not `'error'`

Added mock text keys: `downloadFailedOffline`, `downloadFailedTimeout`, `downloadCancelled`, `emptyTranscription`

Added browser capability stubs in `beforeEach`: `WebAssembly`, `crossOriginIsolated`

Added 10 new test cases:
- Tests 14-16: isSupported=false when Worker missing, when crossOriginIsolated false, no Worker created (ERR-02)
- Test 17: download_timeout error code maps to timeout i18n message (ERR-03)
- Test 18: download_failed error code maps to generic i18n message (ERR-03)
- Test 19: unknown error code falls back to raw error message (ERR-03)
- Tests 20-21: empty and whitespace-only transcription shows toast.info, no text insertion (ERR-04)
- Test 22: valid transcription still inserts text (regression guard)
- Test 23: cancel download shows toast.info (D-06)

**whisper.worker.ui-unit.spec.ts (19 tests total, 6 new):**

Updated 2 existing error tests to expect `code` field:
- Pipeline load failure: now asserts `code: 'download_failed'`
- Transcription failure: now asserts `code: 'transcription_failed'`

Added 6 new test cases:
- download_offline error code when navigator.onLine is false (ERR-03)
- download_timeout error code when error message contains timeout (ERR-03)
- download_failed error code for generic errors when online (ERR-03)
- Singleton reset on failure allows retry (Pitfall 3)
- no_audio error code when audio data missing

**Also fixed:** Pre-existing `Timeout` type error in `useTranscribe.ts` line 156 (`setInterval` -> `window.setInterval`) that was blocking all commits via tsc pre-commit hook (Rule 3 - blocking issue).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing Timeout type error in useTranscribe.ts**
- **Found during:** Task 1 commit attempt
- **Issue:** `setInterval` returns `Timeout` in Node.js types but `timerRef` expects `number`. Pre-commit tsc hook failed on all commits.
- **Fix:** Changed `setInterval` to `window.setInterval` which returns `number` in browser context
- **Files modified:** `frontend/src/hooks/useTranscribe.ts`
- **Commit:** 86a35ac

## Verification Results

| Check | Result |
|-------|--------|
| useLocalTranscribe.ui-unit.spec.ts | 23/23 tests pass |
| whisper.worker.ui-unit.spec.ts | 19/19 tests pass |
| Full frontend test suite | 150/150 tests pass (27 files, 0 regressions) |
| TypeScript compilation | Passes (tsc --noEmit via pre-commit hook) |

## Known Stubs

None -- all tests are fully wired to production code behaviors.

## Checkpoint: Human Verification Pending

Task 2 is a `checkpoint:human-verify` gate requiring manual browser testing of all error handling scenarios (ERR-01 regression, ERR-03 offline, D-06 cancel, ERR-04 empty, ERR-02 compatibility, regression check). See plan for detailed verification steps.

## Self-Check: PASSED

- [x] `frontend/src/hooks/useLocalTranscribe.ui-unit.spec.ts` - FOUND
- [x] `frontend/src/workers/whisper.worker.ui-unit.spec.ts` - FOUND
- [x] `frontend/src/hooks/useTranscribe.ts` - FOUND
- [x] Commit 86a35ac - FOUND
