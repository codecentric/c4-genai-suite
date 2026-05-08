---
phase: 05-polish-refinement
plan: 01
subsystem: frontend
tags: [local-transcription, silence-detection, recording-timer, privacy-badge, i18n]
dependency_graph:
  requires: []
  provides: [silence-detection, recording-timer, privacy-badge, elapsed-time-tracking]
  affects: [whisper-worker, useLocalTranscribe-hook, chat-input]
tech_stack:
  added: []
  patterns: [rms-energy-check, hallucination-filter, worker-status-extension, conditional-inline-rendering]
key_files:
  created:
    - frontend/src/pages/chat/conversation/RecordingTimer.tsx
    - frontend/src/pages/chat/conversation/PrivacyBadge.tsx
  modified:
    - frontend/src/workers/whisper.worker.ts
    - frontend/src/hooks/useLocalTranscribe.ts
    - frontend/src/pages/chat/conversation/ChatInput.tsx
    - frontend/src/texts/languages/en.ts
    - frontend/src/texts/languages/de.ts
decisions:
  - "RMS silence threshold set to 0.01 as tunable constant (SILENCE_RMS_THRESHOLD)"
  - "Hallucination filter uses exact match + punctuation check + repetition check (no length-only filter)"
  - "RecordingTimer and PrivacyBadge created as separate components for testability"
  - "Timer uses inline style fontVariantNumeric: tabular-nums for reliable fixed-width digits"
  - "PrivacyBadge uses IconShieldCheck from @tabler/icons-react in green-700"
metrics:
  duration: "2m 44s"
  completed: "2026-05-08"
---

# Phase 05 Plan 01: Local Transcription Polish Features Summary

Two-layer silence detection (RMS energy pre-check + hallucination post-filter) in the Worker, recording timer with red warning at 15s before auto-stop, privacy badge with shield icon and "Local" text, all wired through the hook into ChatInput with full en/de i18n support.

## Changes Made

### Task 1: Worker silence detection + hook elapsed time + silence handler + i18n keys
**Commit:** ff2f62e

**Worker (whisper.worker.ts):**
- Added `SILENCE_RMS_THRESHOLD = 0.01` constant
- Added `HALLUCINATION_PATTERNS` array with 26 known en/de patterns
- Added `computeRMS(samples: Float32Array): number` -- O(n) RMS energy calculation
- Added `isHallucination(text: string): boolean` -- exact match, punctuation check, repetition detection
- Layer 1: RMS check before transcription skips Whisper entirely for silent audio
- Layer 2: Hallucination filter after transcription catches known Whisper silence outputs
- Both layers return `{ status: 'silence' }` to the hook

**Hook (useLocalTranscribe.ts):**
- Added `elapsedSeconds` state (useState<number>) updated every second via existing 100ms interval
- Reset to 0 in cleanup function, beginRecording start
- New `case 'silence'` handler: `toast.info(silenceDetected)` + transition to idle
- `elapsedSeconds` exposed in return object

**i18n (en.ts + de.ts):**
- `silenceDetected`: "No speech detected..." / "Keine Sprache erkannt..."
- `privacyBadge`: "Local" / "Lokal"
- `privacyTooltip`: "Audio is processed locally..." / "Audio wird lokal verarbeitet..."
- `timerLabel`: "Recording timer" / "Aufnahme-Timer"

### Task 2: RecordingTimer + PrivacyBadge components + ChatInput integration
**Commit:** 81c845a

**RecordingTimer.tsx (new):**
- Props: `elapsedSeconds: number`, `maxSeconds: number`
- Format: `M:SS / 2:00` (e.g., "0:42 / 2:00")
- Warning threshold: `maxSeconds - 15` (105s for 2-minute max)
- Normal: `text-gray-600`, Warning: `text-red-600`
- `fontVariantNumeric: 'tabular-nums'` for fixed-width digits
- `aria-live="off"` to prevent disruptive screen reader announcements

**PrivacyBadge.tsx (new):**
- IconShieldCheck (size 14) + "Local" text in `text-green-700`
- Tooltip via `data-tooltip-id="default"` with privacy explanation
- `tabIndex={0}` for keyboard accessibility

**ChatInput.tsx (modified):**
- Imported PrivacyBadge and RecordingTimer
- Layout order: `[PrivacyBadge] [RecordingTimer?] [LocalTranscribeButton] [SubmitButton]`
- Badge always visible when local transcribe active + supported
- Timer conditionally rendered during recording only

## Deviations from Plan

None -- plan executed exactly as written.

## Requirements Fulfilled

| Requirement | Description | Status |
|-------------|-------------|--------|
| UI-05 | Recording timer shows elapsed time (M:SS / 2:00 format) | Complete |
| UI-06 | Privacy badge shows local audio processing indicator | Complete |
| ERR-05 | Silence detection returns "No speech detected" instead of hallucination | Complete |

## Verification

- TypeScript compilation: PASS (no type errors from our changes; pre-existing baseUrl deprecation warning only)
- Frontend test suite: Could not run due to pre-existing `@tailwindcss/vite` dependency resolution issue in worktree environment
- All acceptance criteria verified via grep checks

## Self-Check: PASSED

All files exist, all commits found, all key content verified.
