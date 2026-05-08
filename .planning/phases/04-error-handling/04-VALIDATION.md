---
phase: 4
slug: error-handling
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-08
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.4 (frontend) |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts src/workers/whisper.worker.ui-unit.spec.ts` |
| **Full suite command** | `cd frontend && npx vitest run` |
| **Estimated runtime** | ~0.6 seconds (phase tests), ~3 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts src/workers/whisper.worker.ui-unit.spec.ts`
- **After every plan wave:** Run `cd frontend && npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | ERR-01 | — | Mic denied shows toast, no download | unit | `npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts` | ✅ | ✅ green |
| 04-01-02 | 01 | 1 | ERR-02 | — | isSupported=false hides button, no Worker created | unit | `npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts` | ✅ | ✅ green |
| 04-01-03 | 01 | 1 | ERR-03 | T-04-01 | Error codes map to i18n messages, idle state on failure | unit | `npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts src/workers/whisper.worker.ui-unit.spec.ts` | ✅ | ✅ green |
| 04-01-04 | 01 | 1 | ERR-04 | — | Empty/whitespace transcription shows toast.info, no text insertion | unit | `npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts` | ✅ | ✅ green |
| 04-02-01 | 02 | 2 | ERR-03 | T-04-03 | Worker detects offline/timeout/generic errors with correct codes | unit | `npx vitest run src/workers/whisper.worker.ui-unit.spec.ts` | ✅ | ✅ green |
| 04-02-02 | 02 | 2 | ERR-03 | — | Singleton reset on failure allows retry | unit | `npx vitest run src/workers/whisper.worker.ui-unit.spec.ts` | ✅ | ✅ green |
| 04-02-03 | 02 | 2 | D-06 | — | Cancel download shows toast.info | unit | `npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Test Details

### useLocalTranscribe.ui-unit.spec.ts (29 tests)

| # | Test Name | Requirement |
|---|-----------|-------------|
| 1 | starts in idle state with downloadProgress null | baseline |
| 2 | creates Worker on mount and becomes idle on ready | baseline |
| 3 | posts load to Worker on first click, auto-starts recording on ready | baseline |
| 4 | goes directly to recording state when model already loaded | baseline |
| 5 | updates downloadProgress on progress_total message | baseline |
| 6 | stops recording, resamples audio, and posts transcribe to Worker | baseline |
| 7 | calls onTranscriptReceived and sets idle on result | baseline |
| 8 | auto-stops recording after maxDurationMs and shows toast | baseline |
| 9 | posts transcribe message with Transferable transfer list | baseline |
| 10 | passes language parameter to Worker transcribe message | baseline |
| 11 | sets idle state and shows toast on Worker error with code | ERR-03 |
| 12 | terminates Worker and cleans up on unmount | baseline |
| 13 | does not allow recording during downloading state | baseline |
| 14 | returns isSupported=false when Worker is not available | ERR-02 |
| 15 | returns isSupported=false when crossOriginIsolated is false | ERR-02 |
| 16 | does not create Worker when isSupported is false | ERR-02 |
| 17 | maps download_timeout error code to timeout i18n message | ERR-03 |
| 18 | maps download_failed error code to generic download i18n message | ERR-03 |
| 19 | falls back to raw error message for unknown error codes | ERR-03 |
| 20 | shows toast.info and does not insert text for empty transcription | ERR-04 |
| 21 | shows toast.info for whitespace-only transcription | ERR-04 |
| 22 | inserts text for non-empty transcription result | ERR-04 (regression) |
| 23 | does not start model download when mic permission is denied | ERR-01 |
| 24 | shows toast.info when download is cancelled | D-06 |
| 25 | elapsed seconds: should expose elapsedSeconds initially as 0 | Phase 5 |
| 26 | elapsed seconds: should update elapsedSeconds during recording | Phase 5 |
| 27 | silence: should show toast.info on silence status | Phase 5 |
| 28 | silence: should return to idle state on silence status | Phase 5 |
| 29 | silence: should NOT call onTranscriptReceived on silence status | Phase 5 |

### whisper.worker.ui-unit.spec.ts (26 tests)

| # | Test Name | Requirement |
|---|-----------|-------------|
| 1 | singleton pipeline: returns same promise instance | baseline |
| 2 | device detection: returns webgpu when adapter available | baseline |
| 3 | device detection: returns wasm when navigator.gpu undefined | baseline |
| 4 | device detection: returns wasm when requestAdapter returns null | baseline |
| 5 | language mapping: maps de to german | baseline |
| 6 | language mapping: maps en to english | baseline |
| 7 | language mapping: falls back to english for unknown codes | baseline |
| 8 | load: posts ready status after successful model load | baseline |
| 9 | load: passes progress_callback that forwards ProgressInfo | baseline |
| 10 | transcribe: posts result with trimmed text | baseline |
| 11 | transcribe: calls transcriber with task transcribe | baseline |
| 12 | transcribe: handles array result from transcriber | baseline |
| 13 | error: posts download_failed code when pipeline load fails | ERR-03 |
| 14 | error: posts transcription_failed code when transcription fails | ERR-03 |
| 15 | error: posts download_offline code when navigator.onLine is false | ERR-03 |
| 16 | error: posts download_timeout code when message contains timeout | ERR-03 |
| 17 | error: posts download_failed code for generic errors when online | ERR-03 |
| 18 | error: resets TranscriberPipeline.instance on load failure to allow retry | ERR-03 |
| 19 | error: posts no_audio code when audio data is missing | ERR-03 |
| 20 | silence: returns silence status when audio RMS below threshold | Phase 5 |
| 21 | silence: proceeds to transcription when audio RMS above threshold | Phase 5 |
| 22 | silence: returns silence for known hallucination "Thank you." | Phase 5 |
| 23 | silence: returns silence for German hallucination "Untertitel" | Phase 5 |
| 24 | silence: returns silence for punctuation-only text | Phase 5 |
| 25 | silence: returns silence for repetitive text | Phase 5 |
| 26 | silence: should NOT filter legitimate short text like "Hello" | Phase 5 |

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Browser without Worker/WASM hides button | ERR-02 | Requires testing in actual unsupported browser | Open in Safari iOS < 16.4 or disable SharedArrayBuffer headers |

*All other phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 3s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-08

---

## Validation Audit 2026-05-08

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Total tests (phase) | 55 |
| Requirements covered | ERR-01, ERR-02, ERR-03, ERR-04, D-06 |
