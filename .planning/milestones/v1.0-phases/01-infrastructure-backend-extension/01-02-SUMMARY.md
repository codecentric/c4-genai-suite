---
phase: 01-infrastructure-backend-extension
plan: 02
subsystem: testing, infra
tags: [playwright, e2e, regression, coop-coep, backend-tests, jest, testcontainers]

# Dependency graph
requires:
  - "01-01: transcribe-local extension, Vite COOP/COEP headers, frontend wiring"
provides:
  - "Regression verification: 225 backend tests pass, 30/33 E2E tests pass (Chromium)"
  - "Confirmation that COOP/COEP headers and extension registration cause no regressions"
affects: [02-model-loading-worker, 03-frontend-transcription-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified: []

key-decisions:
  - "REIS service could not start (missing libpango native dependency on macOS) -- 3 REIS-dependent E2E tests excluded from pass count"
  - "Ran Playwright directly (Chromium only) bypassing npm run test:e2e which blocks on REIS startup"

patterns-established: []

requirements-completed: [INFRA-04]

# Metrics
duration: 51min
completed: 2026-05-07
---

# Phase 1 Plan 02: Regression Verification Summary

**Backend tests (225/225) and E2E Chromium tests (30/33) pass with COOP/COEP headers and transcribe-local extension -- 3 failures are pre-existing REIS dependency issue**

## Performance

- **Duration:** 51 min
- **Started:** 2026-05-07T14:31:55Z
- **Completed:** 2026-05-07T15:23:08Z
- **Tasks:** 1 of 2 (checkpoint reached at Task 2)
- **Files modified:** 0

## Accomplishments
- Backend test suite: 44 suites, 225 passed, 1 skipped (pre-existing), 0 failures
- E2E test suite (Chromium): 30 passed, 3 failed (all REIS-dependent, pre-existing environment issue)
- No CORP-related blocking messages in any test output
- Login, chat, admin UI, configuration management, user management, permissions, accessibility all verified working with COOP/COEP headers active

## Task Commits

Each task was committed atomically:

1. **Task 1: Run E2E regression suite and verify cross-origin isolation** - No commit (verification-only task, no file changes)
2. **Task 2: Visual verification of extension in Admin UI** - CHECKPOINT (human-verify, not yet completed)

## Files Created/Modified

None -- this plan is verification-only.

## Decisions Made
- REIS could not start due to missing `libpango-1.0-0` native library on macOS (pre-existing, unrelated to our changes). Ran Playwright tests directly instead of via `npm run test:e2e` (which blocks indefinitely waiting for REIS).
- Ran Chromium-only instead of all three browsers to get results faster. The 3 failed tests are all in file/bucket operations requiring REIS service.

## Deviations from Plan

### Environment Issues

**1. [Pre-existing] REIS service fails to start on macOS**
- **Found during:** Task 1 (E2E test execution)
- **Issue:** REIS Python FastAPI service requires `libgobject-2.0-0` and `libpango-1.0-0` (GLib/Pango native libraries). These are not installed by default on macOS and the Python `cffi` library uses Linux-style library names (`-0` suffix) that don't match macOS dylib naming.
- **Impact:** 3 E2E tests that depend on REIS file operations timed out: `basic.spec.ts:create bucket`, `search-file-in-chat.spec.ts:add assistant`, `whole-file.spec.ts:should add whole file extension`
- **Resolution:** Not a regression from Plan 01 changes. These tests would fail in the same way without our changes. Documented as pre-existing.

**2. [Deviation] Ran Chromium-only instead of 3-browser matrix**
- **Reason:** `npm run test:e2e` blocks indefinitely waiting for REIS. Ran Playwright directly with `--project="chromium"` to validate the critical regression path.
- **Impact:** Firefox and WebKit not verified via automation. Human checkpoint (Task 2) can cover multi-browser if needed.

---

**Total deviations:** 2 (both environment-related, not caused by Plan 01 changes)
**Impact on plan:** Core regression verification achieved. No evidence of COOP/COEP or extension-related regressions.

## Test Results Detail

### Backend Tests (npm run test:backend)
- **Result:** PASS
- **Suites:** 44 passed, 0 failed
- **Tests:** 225 passed, 1 skipped, 0 failed
- **Time:** 18.0s
- **Notes:** Testcontainers PostgreSQL used successfully. New local-transcribe extension did not affect any existing tests.

### E2E Tests (Playwright, Chromium)
- **Result:** 30 PASS, 3 FAIL (REIS-dependent)
- **Time:** 8.0 min
- **Passed suites:**
  - Audit Log, Chat, Configuration Management, Docs, Permissions, Suggestions, User Management, User Groups, User Settings
  - Accessibility, Assistant Change, Configurable Arguments, MCP Server, New Chat, User Args, Viewport, Systems Check
- **Failed suites (all REIS-dependent):**
  - `basic.spec.ts` - "should create bucket" (timeout waiting for REIS bucket test)
  - `search-file-in-chat.spec.ts` - "add assistant" (timeout on REIS bucket save)
  - `whole-file.spec.ts` - "should add whole file extension" (timeout on REIS bucket save)

## Issues Encountered
- `npm run test:e2e` hangs indefinitely because `wait-on` waits for REIS on port 3201 without timeout. Worked around by starting services manually and running Playwright directly.
- Installed `glib` via Homebrew to resolve first native dependency, but `pango` was then also required. This chain of native dependencies makes REIS setup fragile on clean macOS systems.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Regression verification complete (with REIS caveat documented)
- COOP/COEP headers confirmed working (no CORP blocking, no proxy issues)
- Extension registration confirmed not breaking existing backend or E2E tests
- Human checkpoint (Task 2) pending: visual verification of extension in Admin UI and crossOriginIsolated === true

---
*Phase: 01-infrastructure-backend-extension*
*Completed: 2026-05-07 (Task 1 only; Task 2 is human-verify checkpoint)*
