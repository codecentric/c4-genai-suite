---
phase: 06-tech-debt-documentation-code-cleanup
reviewed: 2026-05-08T12:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - frontend/src/hooks/useLocalTranscribe.ts
  - frontend/src/workers/whisper.worker.ts
  - frontend/src/pages/chat/conversation/LocalTranscribeButton.tsx
  - frontend/src/pages/chat/conversation/DownloadProgressBanner.tsx
  - frontend/src/pages/chat/conversation/PrivacyBadge.tsx
  - frontend/src/pages/chat/conversation/RecordingTimer.tsx
  - frontend/src/lib/audio-utils.ts
  - backend/src/extensions/other/local-transcribe.ts
findings:
  critical: 2
  warning: 4
  info: 0
  total: 6
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-05-08T12:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Reviewed eight files implementing the local (browser-side) Whisper transcription feature: a React hook managing the full lifecycle, a Web Worker for model inference, four UI components, a resampling utility, and a backend extension registration. The code is generally well-structured with good JSDoc coverage and sensible state management via refs. However, two crash-causing bugs were found around worker null dereferences, plus several robustness issues that could cause hangs or unexpected behavior.

## Critical Issues

### CR-01: Null dereference crash when worker is null during transcription send

**File:** `frontend/src/hooks/useLocalTranscribe.ts:288`
**Issue:** The `recorder.onstop` callback at line 266 uses a non-null assertion `workerRef.current!.postMessage(...)` at line 288. This crashes with `TypeError: Cannot read properties of null` in at least two scenarios:

1. **Component unmount during recording:** React cleanup effects run in reverse registration order. The MediaRecorder cleanup effect (line 378) fires first, calling `recorder.stop()` which schedules the `onstop` callback. Then the worker cleanup effect (line 250) fires, setting `workerRef.current = null` and terminating the worker. When the `onstop` callback finally fires (asynchronously), `workerRef.current` is already null.

2. **Theoretical race if `cancelDownload` is somehow called while state tracking is inconsistent.**

**Fix:**
```typescript
// Line 288: Replace non-null assertion with a guard
const worker = workerRef.current;
if (!worker) {
  setState('idle');
  resolve();
  return;
}
worker.postMessage(
  { type: 'transcribe', audio: audioData, language: languageRef.current },
  [audioData.buffer],
);
```

### CR-02: Promise never resolves when MediaRecorder.state diverges from hook state

**File:** `frontend/src/hooks/useLocalTranscribe.ts:300-303`
**Issue:** `stopRecording` sets up the `recorder.onstop` handler (line 266) and then conditionally calls `recorder.stop()` only if `recorder.state === 'recording'` (line 300). If the browser's MediaRecorder has already transitioned to `'inactive'` or `'paused'` (due to a browser error, track ending, or timing race) while `stateRef.current` is still `'recording'`, then `recorder.stop()` is never called. The `onstop` event never fires, and the returned Promise never resolves. This silently hangs the `toggleRecording` call and leaves the UI stuck in the `'recording'` state indefinitely.

**Fix:**
```typescript
// After line 303, add a fallback resolution:
if (recorder.state === 'recording') {
  recorder.requestData();
  recorder.stop();
} else {
  // MediaRecorder is already inactive -- resolve immediately
  cleanup();
  setState('idle');
  resolve();
}
```

## Warnings

### WR-01: Division by zero in computeRMS produces NaN, bypassing silence detection

**File:** `frontend/src/workers/whisper.worker.ts:48-54`
**Issue:** `computeRMS` divides by `samples.length` without checking for zero length. If a zero-length `Float32Array` is received (e.g., from an extremely short recording that rounds to 0 samples during resampling), the result is `NaN`. On line 147, `NaN < SILENCE_RMS_THRESHOLD` evaluates to `false`, so silence detection is bypassed and the invalid audio is sent to the Whisper model, which could produce garbage output or throw.

**Fix:**
```typescript
function computeRMS(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSquares += samples[i] * samples[i];
  }
  return Math.sqrt(sumSquares / samples.length);
}
```

### WR-02: User stuck in 'downloading' state if workerRef is null when load is triggered

**File:** `frontend/src/hooks/useLocalTranscribe.ts:333-336`
**Issue:** When `startRecording` triggers a model download, line 333 sets `pendingRecordRef.current = true` and line 334 sets state to `'downloading'`, then line 335 uses optional chaining (`workerRef.current?.postMessage`) to send the load message. If `workerRef.current` is null (e.g., due to a timing issue during effect cleanup or if `isSupported` check was bypassed by a parent), the load message is silently dropped but the state remains `'downloading'` with no way for the user to recover -- `cancelDownload` terminates a null worker and creates a new one, but the `pendingRecordRef` remains true and `modelLoadedRef` false.

**Fix:**
```typescript
const worker = workerRef.current;
if (!worker) {
  pendingRecordRef.current = false;
  setState('idle');
  toast.error(texts.chat.localTranscribe.loadFailed);
  return;
}
pendingRecordRef.current = true;
setState('downloading');
worker.postMessage({ type: 'load' });
```

### WR-03: RecordingTimer warning threshold is negative when maxSeconds < 15

**File:** `frontend/src/pages/chat/conversation/RecordingTimer.tsx:9`
**Issue:** `WARNING_THRESHOLD = maxSeconds - 15` produces a negative value when `maxSeconds < 15`. This causes `isWarning` to be `true` from the very start of recording, showing the timer in red the entire time. While the default `maxDurationMs` (2 minutes = 120 seconds) avoids this, the component accepts arbitrary `maxSeconds` and should handle small values gracefully.

**Fix:**
```typescript
const WARNING_THRESHOLD = Math.max(0, maxSeconds - 15);
```

### WR-04: Unmount cleanup calls cleanup() before stopping MediaRecorder, causing lost audio chunks

**File:** `frontend/src/hooks/useLocalTranscribe.ts:378-385`
**Issue:** The unmount cleanup effect calls `cleanup()` on line 380 which resets `audioChunksRef.current = []` (line 83), then calls `mediaRecorderRef.current.stop()` on line 382. This ordering means any `ondataavailable` events that fire between `cleanup()` and `stop()` would push into the already-cleared array. More importantly, `cleanup()` stops all media tracks first (line 76), which may cause the MediaRecorder to transition to `'inactive'` before `stop()` is called on line 382. When the `onstop` handler (from a previous `stopRecording` call still pending) fires, `audioChunksRef.current` is empty, triggering the "no audio recorded" error path instead of gracefully ignoring the unmount.

**Fix:**
```typescript
return () => {
  // Stop recorder BEFORE cleanup to preserve proper event ordering
  if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
    mediaRecorderRef.current.stop();
  }
  cleanup();
};
```

---

_Reviewed: 2026-05-08T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
