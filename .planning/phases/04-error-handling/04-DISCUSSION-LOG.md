# Phase 4: Error Handling - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-08
**Phase:** 4-Error Handling
**Areas discussed:** Browser compatibility, Download failure retry, Empty transcription UX

---

## Browser Compatibility

### Capability check scope

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: Worker + WASM | Check window.Worker and WebAssembly exist. Covers the core ERR-02 requirement. | |
| Full: Worker + WASM + getUserMedia | Also check navigator.mediaDevices.getUserMedia exists. Hides button entirely on browsers without mic API. | ✓ |
| You decide | Claude chooses the right set of checks based on what could actually crash vs what's handled elsewhere. | |

**User's choice:** Full: Worker + WASM + getUserMedia
**Notes:** None

### Incompatibility feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Silent absence | Button simply doesn't render. No message, no disabled state. Cleanest UX. | ✓ |
| Console warning only | Button doesn't render, but console.warn logs which capability is missing. | |
| Disabled with tooltip | Button renders disabled with tooltip explaining browser requirements. | |

**User's choice:** Silent absence
**Notes:** None

### Check location

| Option | Description | Selected |
|--------|-------------|----------|
| Hook exposes isSupported | useLocalTranscribe adds a static isSupported check. ChatInput reads it to conditionally render. | ✓ |
| Standalone utility | Separate isLocalTranscribeSupported() function in lib/. ChatInput calls it directly. | |
| You decide | Claude picks the cleanest place based on existing code patterns. | |

**User's choice:** Hook exposes isSupported
**Notes:** None

### SharedArrayBuffer check

| Option | Description | Selected |
|--------|-------------|----------|
| Include SharedArrayBuffer | Check self.crossOriginIsolated === true. Catches misconfigured deployments. | ✓ |
| Skip SharedArrayBuffer | COOP/COEP is an infra concern. If headers are missing, that's a deployment bug. | |
| You decide | Claude decides based on what actually breaks without SharedArrayBuffer. | |

**User's choice:** Include SharedArrayBuffer
**Notes:** None

---

## Download Failure Retry

### Retry mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Click mic again | Error toast appears, button returns to idle. User clicks mic again to retry. Simple and consistent. | ✓ |
| Retry button in toast | Toast includes an action button to retry immediately. Saves finding the mic button. | |
| Auto-retry with backoff | Automatically retry 1-2 times before showing error. Could delay showing error on real failures. | |

**User's choice:** Click mic again
**Notes:** None

### Error message specificity

| Option | Description | Selected |
|--------|-------------|----------|
| Single message | Use existing i18n key 'downloadFailed'. Same message regardless of failure cause. | |
| Network-aware messages | Differentiate between offline, timeout, and other failures. More actionable. | ✓ |
| You decide | Claude decides based on what error info the Worker/Transformers.js actually provides. | |

**User's choice:** Network-aware messages
**Notes:** None

### Cancel toast

| Option | Description | Selected |
|--------|-------------|----------|
| No toast on cancel | User explicitly cancelled — they know what happened. Silent return to idle. | |
| Info toast on cancel | Show brief toast.info like "Download cancelled." Confirms the action. | ✓ |
| You decide | Claude picks based on existing cancel patterns in the app. | |

**User's choice:** Info toast on cancel
**Notes:** None

---

## Empty Transcription UX

### Behavior on empty result

| Option | Description | Selected |
|--------|-------------|----------|
| Toast + no insertion | Show toast.info with message. Don't insert anything into chat input. Return to idle. | ✓ |
| Toast + insert placeholder | Show toast.info AND insert placeholder like "[No transcription]" into chat input. | |
| Silent no-op | Don't insert text, don't show toast. Just return to idle. Violates ERR-04. | |

**User's choice:** Toast + no insertion
**Notes:** None

### Message content

| Option | Description | Selected |
|--------|-------------|----------|
| Generic: try again | "No speech could be recognized. Please try again." Simple, actionable. | |
| Helpful: with tips | "No speech could be recognized. Try speaking louder or closer to the microphone." More actionable. | ✓ |
| You decide | Claude picks based on existing toast message patterns in the app. | |

**User's choice:** Helpful: with tips
**Notes:** None

---

## Claude's Discretion

- Feature detection implementation (vs. user-agent sniffing)
- Error code schema between Worker and main thread
- Network failure detection approach in the Worker
- Exact i18n key naming for new error messages
- Whitespace trimming before empty check

## Deferred Ideas

None — discussion stayed within phase scope
