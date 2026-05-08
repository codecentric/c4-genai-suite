# Phase 5: Polish & Refinement - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-08
**Phase:** 5-Polish & Refinement
**Areas discussed:** Recording timer placement, Privacy indicator form, Silence detection strategy

---

## Recording Timer Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Below the mic button | Small text label directly under the LocalTranscribeButton group, visible only during recording. New pattern. | |
| Next to the button (inline) | Timer text appears to the left of the mic button in the ChatInput area, inline at the same height. Compact. | ✓ |
| Inside the tooltip | Replace tooltip content during recording with timer text. Minimal UI footprint but less visible. | |
| You decide | Let Claude pick the best placement. | |

**User's choice:** Next to the button (inline)
**Notes:** None

### Timer Warning Color

| Option | Description | Selected |
|--------|-------------|----------|
| No color change | Plain text the whole time. Toast at 2 minutes is sufficient. | |
| Red/warning near limit | Timer text turns red in last ~15 seconds as visual warning. | ✓ |
| You decide | Let Claude choose. | |

**User's choice:** Red/warning near limit
**Notes:** None

---

## Privacy Indicator Form

| Option | Description | Selected |
|--------|-------------|----------|
| Small text badge near button | Compact chip/badge with shield icon + "Local" text. Always visible when extension active. | ✓ |
| Tooltip on mic button | Privacy message in idle tooltip. Zero UI footprint but hover-only. | |
| One-time info banner | Info banner above ChatInput on first use, dismissible, stored in localStorage. | |
| You decide | Let Claude choose. | |

**User's choice:** Small text badge near button
**Notes:** None

### Badge Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Always (when extension active) | Permanently visible when assistant has local transcription enabled. | ✓ |
| Only during recording/transcribing | Appears only during active use. Less visual clutter. | |
| You decide | Let Claude choose. | |

**User's choice:** Always (when extension active)
**Notes:** None

---

## Silence Detection Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Audio energy check (pre-transcription) | RMS analysis on Float32Array before Worker transcription. Skip transcription if below threshold. | |
| Hallucination filter (post-transcription) | Let Whisper transcribe, then check output for known hallucination patterns. | |
| Both layers | Pre-check energy first, then also filter post-transcription. Belt and suspenders. | ✓ |
| You decide | Let Claude choose. | |

**User's choice:** Both layers
**Notes:** None

### Detection Location

| Option | Description | Selected |
|--------|-------------|----------|
| Both checks in Worker | Worker does RMS check first, then transcribes and filters hallucinations. Main thread receives final result or silence status. | ✓ |
| Energy in main thread, hallucination in Worker | Split responsibility between main thread and Worker. | |
| You decide | Let Claude decide. | |

**User's choice:** Both checks in Worker
**Notes:** None

---

## Claude's Discretion

- RMS energy threshold value (tunable constant)
- Hallucination pattern list and matching algorithm
- Timer component structure (separate or inline)
- CSS/Tailwind styling for timer and badge
- Red threshold timing (last 15 seconds suggested)
- Shield vs lock icon choice for privacy badge
- i18n key naming within `texts.chat.localTranscribe.*`

## Deferred Ideas

None — discussion stayed within phase scope
