---
phase: 02-core-transcription-pipeline
verified: 2026-05-07T19:56:00Z
status: human_needed
score: 5/5
overrides_applied: 0
human_verification:
  - test: "Load the app with transcribe-local extension enabled, click record for the first time. Observe that the Whisper model downloads (~145MB), then recording begins automatically."
    expected: "Download progress is visible, model loads, recording starts. On second page load, the model loads from cache instantly without re-downloading."
    why_human: "Cache behavior and download speed depend on Transformers.js Cache API runtime behavior -- cannot verify statically"
  - test: "Record audio for more than 2 minutes. Observe auto-stop behavior."
    expected: "Recording auto-stops at 2 minutes with a toast notification, then transcription begins."
    why_human: "Timer behavior with real MediaRecorder and browser audio APIs cannot be verified without running the app"
  - test: "Record a short phrase in German with language set to 'de', then record a phrase in English with language set to 'en'."
    expected: "German audio produces German text output. English audio produces English text output. No garbled text (fp16 assumption A1 from RESEARCH.md)."
    why_human: "Actual Whisper model inference quality and fp16 dtype compatibility require live model execution in the browser"
---

# Phase 2: Core Transcription Pipeline Verification Report

**Phase Goal:** Audio can be recorded, resampled, and transcribed via Whisper running entirely in the browser -- end-to-end pipeline works without any UI
**Verified:** 2026-05-07T19:56:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Calling the useLocalTranscribe hook records audio, sends it to a Web Worker, and returns transcribed text without blocking the main thread | VERIFIED | Hook at `useLocalTranscribe.ts:190` creates Worker, `line 71` captures audio via getUserMedia, `line 234` resamples, `line 237` transfers to Worker, Worker at `whisper.worker.ts:75` runs inference via Transformers.js, `line 81` posts result, hook `line 177` delivers via callback. 13 tests pass covering full flow. |
| 2 | The Whisper model downloads on first use and loads instantly from cache on subsequent uses (no re-download) | VERIFIED | Worker singleton pattern (`whisper.worker.ts:19` -- `this.instance ??= pipeline(...)`) ensures single load. Hook sends `{type:'load'}` on mount (`useLocalTranscribe.ts:196`) for pre-loading. Transformers.js handles caching internally via Cache API. Hook state machine distinguishes `loading` vs `downloading`. |
| 3 | Audio is correctly resampled to 16kHz mono Float32Array and transferred to the Worker without copying (zero-copy via Transferable) | VERIFIED | `audio-utils.ts:11` creates `OfflineAudioContext(1, numSamples, 16000)` -- 1 channel, 16kHz. Returns `Float32Array` via `.getChannelData(0).slice()` (line 18). Hook `line 237-239` calls `postMessage({...}, [audioData.buffer])` with Transferable transfer list. 7 audio-utils tests + hook test 9 verify. |
| 4 | Recording automatically stops after 2 minutes | VERIFIED | `useLocalTranscribe.ts:20` defaults `maxDurationMs = 2 * 60 * 1000`. Timer at line 96-106 checks `elapsed >= maxDurationMsRef.current`, calls `recorder.requestData()` and `recorder.stop()`, shows toast `maxDurationReached`. Hook test 8 verifies with `vi.advanceTimersByTime(120100)`. |
| 5 | Transcription works in both German and English when the language parameter is set | VERIFIED | Worker `whisper.worker.ts:10-13` maps `de -> german`, `en -> english`. Line 68: `LANGUAGE_MAP[language] ?? 'english'`. Hook passes `languageRef.current` to Worker (line 237). Worker tests 3-5 verify de/en/unknown mapping. Hook test 10 verifies language pass-through. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/workers/whisper.worker.ts` | Web Worker with singleton pipeline, WebGPU detection, progress, language mapping | VERIFIED | 89 lines. Singleton `TranscriberPipeline` class, `detectDevice()` with WebGPU/WASM, `LANGUAGE_MAP`, message handler for load/transcribe. No stubs. |
| `frontend/src/lib/audio-utils.ts` | Audio resampling to 16kHz mono via OfflineAudioContext | VERIFIED | 22 lines. `resampleToMono16kHz(audioBlob)` using `OfflineAudioContext(1, numSamples, 16000)` with `finally { audioContext.close() }`. Complete implementation. |
| `frontend/src/hooks/useLocalTranscribe.ts` | React hook orchestrating Worker + MediaRecorder + resampling + state machine | VERIFIED | 302 lines. Exports `useLocalTranscribe`, `LocalTranscribeState`, `DownloadProgress`. Full state machine (6 states), Worker init on mount, MediaRecorder capture, Transferable transfer, 2-minute auto-stop, cleanup on unmount. |
| `frontend/src/workers/whisper.worker.ui-unit.spec.ts` | Unit tests for worker logic | VERIFIED | 340 lines. 14 tests covering singleton, device detection (WebGPU/WASM/null adapter), language mapping (de/en/unknown), load/transcribe flow, progress forwarding, error handling. All pass. |
| `frontend/src/lib/audio-utils.ui-unit.spec.ts` | Unit tests for audio resampling | VERIFIED | 158 lines. 7 tests covering Float32Array return type, OfflineAudioContext args, ceil calculation, cleanup (success + error), slice copy, source connection. All pass. |
| `frontend/src/hooks/useLocalTranscribe.ui-unit.spec.ts` | Unit tests for hook state machine and orchestration | VERIFIED | 473 lines. 13 tests covering initial state, mount pre-load, first-click download, model-loaded recording, download progress, stop+transcribe, result callback, auto-stop, Transferable, language parameter, Worker error, unmount cleanup, download blocking. All pass. |
| `frontend/src/texts/languages/en.ts` | English i18n keys for localTranscribe | VERIFIED | `localTranscribe` block at line 191 with 12 keys: downloadingModel, downloadFailed, loadingModel, loadFailed, transcriptionFailed, maxDurationReached, microphonePermissionDenied, recordingStartFailed, noAudioRecorded, startRecording, stopRecording, transcribing. |
| `frontend/src/texts/languages/de.ts` | German i18n keys for localTranscribe | VERIFIED | `localTranscribe` block at line 194 with 12 German-translated keys matching en.ts structure. |
| `frontend/src/texts/index.ts` | TypeScript type entries for localTranscribe | VERIFIED | Lines 221-233: 12 `translate('chat.localTranscribe.X')` entries in the `load()` function, ensuring TypeScript type resolution. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `whisper.worker.ts` | `@huggingface/transformers` | `pipeline()` import | WIRED | Line 1: `import { env, pipeline } from '@huggingface/transformers'`; Line 19: `pipeline('automatic-speech-recognition', ...)` |
| `audio-utils.ts` | `OfflineAudioContext` | Browser API | WIRED | Line 11: `new OfflineAudioContext(1, numSamples, targetSampleRate)` |
| `useLocalTranscribe.ts` | `whisper.worker.ts` | `new Worker(...)` | WIRED | Line 190: `new Worker(new URL('../workers/whisper.worker.ts', import.meta.url), { type: 'module' })` |
| `useLocalTranscribe.ts` | `audio-utils.ts` | `import { resampleToMono16kHz }` | WIRED | Line 3: import; Line 234: usage in `stopRecording` |
| `useLocalTranscribe.ts` | `navigator.mediaDevices.getUserMedia` | MediaRecorder API | WIRED | Line 71: `getUserMedia({ audio: true })`, Line 74: `new MediaRecorder(stream, { mimeType: 'audio/webm' })` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `useLocalTranscribe.ts` | `state` (LocalTranscribeState) | Internal useState, driven by Worker messages | Yes -- transitions through 6 states based on real Worker events | FLOWING |
| `useLocalTranscribe.ts` | `downloadProgress` (DownloadProgress) | Worker `progress_total` messages | Yes -- populated from Worker's Transformers.js progress callbacks | FLOWING |
| `whisper.worker.ts` | `result.text` (transcription) | Transformers.js pipeline inference | Yes -- actual Whisper model inference on Float32Array audio data | FLOWING |
| `audio-utils.ts` | `renderedBuffer` (Float32Array) | OfflineAudioContext.startRendering() | Yes -- browser-native audio resampling from real Blob input | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Worker tests pass | `cd frontend && npx vitest run src/workers/whisper.worker.ui-unit.spec.ts` | 14 tests passed | PASS |
| Audio-utils tests pass | `cd frontend && npx vitest run src/lib/audio-utils.ui-unit.spec.ts` | 7 tests passed | PASS |
| Hook tests pass | `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts` | 13 tests passed | PASS |
| No lint errors | `cd frontend && npx eslint src/workers/whisper.worker.ts src/lib/audio-utils.ts src/hooks/useLocalTranscribe.ts` | No output (clean) | PASS |
| Worker exports exist | `grep -c 'self.addEventListener' frontend/src/workers/whisper.worker.ts` | 1 | PASS |
| Hook exports exist | `grep -c 'export function useLocalTranscribe' frontend/src/hooks/useLocalTranscribe.ts` | 1 | PASS |
| Resampling export exists | `grep -c 'export async function resampleToMono16kHz' frontend/src/lib/audio-utils.ts` | 1 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| WORK-01 | 02-01 | Whisper inference in dedicated Web Worker | SATISFIED | `whisper.worker.ts` with `self.addEventListener('message', ...)` -- all inference in Worker context |
| WORK-02 | 02-01 | Singleton pipeline (no re-init) | SATISFIED | `TranscriberPipeline.instance ??= pipeline(...)` at line 19 |
| WORK-03 | 02-01 | WebGPU auto-detection with WASM fallback | SATISFIED | `detectDevice()` function checks `navigator.gpu.requestAdapter()`, falls back to `'wasm'` |
| WORK-04 | 02-01 | Download progress reporting | SATISFIED | `progress_callback` in `getInstance()` forwards `ProgressInfo` via `self.postMessage(info)` |
| WORK-05 | 02-01 | Language parameter de/en | SATISFIED | `LANGUAGE_MAP` maps `de->german`, `en->english` with `english` fallback |
| AUDIO-01 | 02-02 | Audio via MediaRecorder | SATISFIED | Hook uses `new MediaRecorder(stream, { mimeType: 'audio/webm' })` with 100ms timeslice |
| AUDIO-02 | 02-01 | Resampling via OfflineAudioContext to 16kHz mono | SATISFIED | `audio-utils.ts`: `new OfflineAudioContext(1, numSamples, 16000)` |
| AUDIO-03 | 02-02 | Float32Array as Transferable (zero-copy) | SATISFIED | Hook `postMessage({...}, [audioData.buffer])` passes ArrayBuffer in transfer list |
| AUDIO-04 | 02-02 | 2-minute auto-stop | SATISFIED | `maxDurationMs = 2 * 60 * 1000` with `setInterval` timer and `maxDurationReached` toast |
| MODEL-01 | 02-02 | On-demand model download | SATISFIED | Hook sends `{type:'load'}` to Worker which triggers `pipeline()` download from HuggingFace |
| MODEL-02 | 02-02 | Browser caching via Transformers.js | SATISFIED | Transformers.js handles Cache API/IndexedDB caching internally. Hook pre-loads on mount (D-06). |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none found) | - | - | - | All production files are clean: no TODO/FIXME, no console.log, no stubs, no placeholder returns. |

### Human Verification Required

### 1. Model Download and Cache Behavior

**Test:** Load the app with transcribe-local extension enabled. Click record for the first time. Observe that the Whisper model downloads (~145MB), then recording begins automatically. Reload the page and click record again.
**Expected:** First use: download progress is visible, model loads, recording starts. Second use: model loads from cache instantly without re-downloading, recording starts immediately on click.
**Why human:** Cache behavior and download speed depend on Transformers.js Cache API runtime behavior -- cannot verify statically.

### 2. Auto-Stop at 2 Minutes

**Test:** Record audio for more than 2 minutes. Observe auto-stop behavior.
**Expected:** Recording auto-stops at 2 minutes with a toast notification, then transcription begins.
**Why human:** Timer behavior with real MediaRecorder and browser audio APIs cannot be verified without running the app.

### 3. German and English Transcription Quality (fp16 Assumption A1)

**Test:** Record a short phrase in German with language set to 'de', then record a phrase in English with language set to 'en'.
**Expected:** German audio produces German text output. English audio produces English text output. No garbled text (fp16 assumption A1 from RESEARCH.md warns fp16 decoder may produce garbled output).
**Why human:** Actual Whisper model inference quality and fp16 dtype compatibility require live model execution in the browser.

### Gaps Summary

No gaps found. All 5 roadmap success criteria are verified in the codebase. All 11 requirements (WORK-01 through WORK-05, AUDIO-01 through AUDIO-04, MODEL-01, MODEL-02) have implementation evidence. All 34 unit tests pass. All key links are wired. No anti-patterns detected.

Three items require human verification: model caching behavior, real-time auto-stop, and fp16 transcription quality. These are runtime behaviors that depend on browser APIs and Whisper model execution.

---

_Verified: 2026-05-07T19:56:00Z_
_Verifier: Claude (gsd-verifier)_
