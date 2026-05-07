# Phase 3: UI Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 3-UI Integration
**Areas discussed:** Download progress UX, Language dropdown behavior, Button visual states, Component composition

---

## Download Progress UX

### Where should the model download progress appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline below button | Small progress bar directly below the mic button. Compact, stays near the action. | |
| Banner above input | Progress bar spans full width above ChatInput area. More visible, shows MB/total. | ✓ |
| Replace button area | Mic button area transforms into a progress indicator during download. | |

**User's choice:** Banner above input

### What information should the progress banner show?

| Option | Description | Selected |
|--------|-------------|----------|
| Bar + percentage + MB | Full detail: progress bar, percentage, and 'X MB / Y MB' text. | ✓ |
| Bar + percentage only | Progress bar with percentage text only. | |
| Bar + text label only | Progress bar with 'Downloading speech model...' text. Minimal. | |

**User's choice:** Bar + percentage + MB (Recommended)

### Should the user be able to cancel the model download?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, with cancel button | Cancel/X button on banner lets user abort. Button returns to idle. | ✓ |
| No cancel needed | Download runs to completion once started. Simpler implementation. | |

**User's choice:** Yes, with cancel button

### What should happen when the download completes?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-start recording | Banner disappears, recording starts automatically (hook D-04). | |
| Show 'Ready' briefly, then auto-record | Brief 'Model ready!' confirmation (1-2s), then auto-starts recording. | ✓ |
| Return to idle, user clicks again | Banner disappears, button returns to idle. Extra click needed. | |

**User's choice:** Show 'Ready' briefly, then auto-record

### Should the banner also appear during initial model loading from cache?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, show loading banner | Show 'Loading speech model...' banner during cache load. | |
| No, just show button spinner | Cache load fast enough for button spinner only. Reserve banner for download. | ✓ |

**User's choice:** No, just show button spinner

---

## Language Dropdown Behavior

### Where should the language state initialize from and how should it persist?

| Option | Description | Selected |
|--------|-------------|----------|
| Extension default, session-only | Init from assistant's `defaultLanguage` config. Resets per page load. | ✓ |
| Extension default, persist in localStorage | Init from admin config, remember override across sessions. | |
| Always start with 'de' | Hardcode default regardless of admin config. | |

**User's choice:** Extension default, session-only (Recommended)

### How should language options be presented?

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown with flag + name | Menu showing flag emoji + full name. | |
| Dropdown with code only | Minimal 'de' / 'en' labels. Compact. | ✓ |
| Dropdown with full name | 'Deutsch' / 'English' without flags. | |

**User's choice:** Dropdown with code only

### Should switching language during an active recording/transcription be allowed?

| Option | Description | Selected |
|--------|-------------|----------|
| Disable during recording | Dropdown disabled while recording/transcribing. | ✓ |
| Allow anytime | Language switchable at any time. Applies on next transcription. | |

**User's choice:** Disable during recording (Recommended)

---

## Button Visual States

### How should the button look in 'idle' state when model is loading from cache?

| Option | Description | Selected |
|--------|-------------|----------|
| Normal mic icon | Show normal mic immediately. Cache load handled transparently. | ✓ |
| Disabled with spinner | Disabled button with spinner until cache load completes. | |
| Greyed out, no spinner | Subtly greyed out until model loads. | |

**User's choice:** Normal mic icon (Recommended)

### How should the 'downloading' state look when user clicks mic for the first time?

| Option | Description | Selected |
|--------|-------------|----------|
| Button disabled + banner handles it | Button disabled/loading, download banner shows progress. | ✓ |
| Button shows mini progress ring | Circular progress on button + banner. Redundant but reinforcing. | |

**User's choice:** Button disabled + banner handles it

### Recording state: match existing TranscribeButton exactly?

| Option | Description | Selected |
|--------|-------------|----------|
| Exact match | Red filled + animate-pulse, identical to TranscribeButton. | ✓ |
| Same red pulse + small indicator | Same pulse + small 'local' badge for privacy hint. | |

**User's choice:** Exact match (Recommended)

### How should the 'error' state be handled visually?

| Option | Description | Selected |
|--------|-------------|----------|
| Return to idle + toast | Button back to idle. Errors via toast only. No persistent error state. | ✓ |
| Red outline briefly, then idle | Brief red outline (1-2s) before idle. Complements toast. | |
| Stay in error state until clicked | Error indicator until user clicks again. | |

**User's choice:** Return to idle + toast (Recommended)

### Transcribing state: same as TranscribeButton (Mantine loading prop)?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, Mantine loading prop | `loading={true}` on ActionIcon. Spinner replaces icon. | ✓ |
| Custom spinner with text | Custom spinner + tooltip text. More informative but deviates from pattern. | |

**User's choice:** Yes, Mantine loading prop (Recommended)

---

## Component Composition

### Should LocalTranscribeButton follow SpeechRecognitionButton layout?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, same layout | Mic + chevron dropdown in Mantine Group. Identical structure. | ✓ |
| Standalone with popover | Single mic, language via popover on hover/long-press. | |
| Separate button + dropdown | Mic and dropdown as separate elements with gap. | |

**User's choice:** Yes, same layout (Recommended)

### Should download progress banner be part of LocalTranscribeButton or separate?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate component in ChatInput | `DownloadProgressBanner` rendered conditionally in ChatInput. | ✓ |
| Part of LocalTranscribeButton | Button renders both button and banner. Self-contained. | |

**User's choice:** Separate component in ChatInput (Recommended)

### Where should the new component files live?

| Option | Description | Selected |
|--------|-------------|----------|
| In conversation/ alongside existing buttons | Next to TranscribeButton.tsx and SpeechRecognitionButton.tsx. | ✓ |
| In components/ (shared) | Shared component location. But only used in ChatInput. | |

**User's choice:** In conversation/ alongside existing buttons (Recommended)

---

## Claude's Discretion

- ChatInput.tsx wiring details (conditional rendering logic)
- Exact Tailwind/CSS classes for the download banner
- i18n key naming within `texts.chat.localTranscribe.*`
- Accessibility label text and ARIA roles
- Internal prop interfaces for new components

## Deferred Ideas

None — discussion stayed within phase scope
