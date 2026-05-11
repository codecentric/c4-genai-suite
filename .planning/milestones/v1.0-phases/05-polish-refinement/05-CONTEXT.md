# Phase 5: Polish & Refinement - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers production-readiness polish for the local transcription feature: a recording timer showing elapsed time relative to the 2-minute maximum, a privacy badge communicating that audio is processed locally, and silence detection that produces a "No speech detected" message instead of Whisper hallucination text. All three features enhance the existing LocalTranscribeButton and useLocalTranscribe hook from prior phases.

</domain>

<decisions>
## Implementation Decisions

### Recording Timer
- **D-01:** Timer displays **inline next to the mic button** (to the left of LocalTranscribeButton), at the same height. Visible only during recording state. Shows format "0:42 / 2:00" (elapsed / maximum).
- **D-02:** Timer text **turns red** when approaching the 2-minute limit (e.g., last 15 seconds) as a visual warning before auto-stop. Normal color before that threshold.
- **D-03:** The `useLocalTranscribe` hook exposes elapsed time — the existing `startTimeRef` and 100ms `setInterval` timer already track recording duration. Expose as a reactive value for UI consumption.

### Privacy Indicator
- **D-04:** Privacy indicator is a **small text badge** with a shield/lock icon and "Local" text, rendered near the LocalTranscribeButton.
- **D-05:** Badge is **always visible** when the local transcription extension is active on the assistant — not just during recording. Provides constant privacy reassurance.
- **D-06:** Badge communicates that audio is processed locally and never leaves the browser. Exact wording needs i18n keys in de/en.

### Silence Detection
- **D-07:** Silence detection uses **two layers**: pre-transcription audio energy check (RMS analysis on Float32Array) AND post-transcription hallucination filtering.
- **D-08:** **Both checks run in the Worker.** Worker receives audio, checks RMS energy first. If below threshold, returns a `silence` status code immediately (skips transcription). If above threshold, transcribes and then filters output for known hallucination patterns.
- **D-09:** Hallucination patterns to filter: very short nonsensical text, repetitive phrases, known Whisper silence hallucinations (e.g., "Thank you for watching", "(music)", "...", single punctuation). Worker returns `silence` status code when detected.
- **D-10:** Main thread handles `silence` status code the same as empty transcription: shows toast.info with "Keine Sprache erkannt" / "No speech detected" message (ERR-05), returns to idle state.

### Claude's Discretion
- Exact RMS energy threshold value for pre-transcription silence check (tunable constant in Worker)
- Specific hallucination pattern list and matching algorithm (regex, substring, or scoring)
- Timer component implementation details (separate component or inline in LocalTranscribeButton)
- Exact Tailwind/CSS styling for timer text and privacy badge
- Red threshold timing for timer (last 15 seconds suggested, Claude can adjust)
- Shield vs lock icon choice for privacy badge
- i18n key naming for new keys within `texts.chat.localTranscribe.*` namespace

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### UI Components (modify)
- `frontend/src/pages/chat/conversation/LocalTranscribeButton.tsx` — Button component to extend with timer display and privacy badge.
- `frontend/src/pages/chat/conversation/ChatInput.tsx` §179-305 — Integration point where timer and badge render alongside the button.

### Hook (modify)
- `frontend/src/hooks/useLocalTranscribe.ts` — Hook that needs to expose elapsed recording time as a reactive value. Currently tracks `startTimeRef` (line 39) and has 100ms interval (line 104).

### Worker (modify)
- `frontend/src/workers/whisper.worker.ts` — Web Worker that needs RMS energy check and hallucination filter before/after transcription.

### i18n (modify)
- `frontend/src/texts/languages/en.ts` §191-212 — Existing `localTranscribe` keys. New keys needed for: silence detected, privacy badge text, timer label.
- `frontend/src/texts/languages/de.ts` §194-212 — German translations, same structure.

### Pattern References (read-only)
- `frontend/src/pages/chat/conversation/TranscribeButton.tsx` — Visual state reference for recording appearance.
- `frontend/src/pages/chat/conversation/SpeechRecognitionButton.tsx` — Layout reference for button + dropdown structure.

### Prior Phase Decisions
- `.planning/phases/02-core-transcription-pipeline/02-CONTEXT.md` — D-07: hook state machine, D-11: auto-stop at 2 min
- `.planning/phases/03-ui-integration/03-CONTEXT.md` — D-11: recording = red + pulse, D-13: error → idle
- `.planning/phases/04-error-handling/04-CONTEXT.md` — D-07/D-08: empty transcription → toast.info with tips

### Project Requirements
- `.planning/REQUIREMENTS.md` §UI-Komponenten — UI-05 (recording timer), UI-06 (privacy badge)
- `.planning/REQUIREMENTS.md` §Fehlerbehandlung — ERR-05 (silence detection)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useLocalTranscribe.ts:startTimeRef` + `timerRef` with 100ms interval: already tracks recording duration internally. Needs to expose elapsed time as state for UI consumption.
- `toast.info()` from `react-toastify`: established notification pattern, already used for `emptyTranscription` and `downloadCancelled`.
- `animate-pulse` Tailwind class: used on recording button, could be applied to timer for visual emphasis.
- `texts.chat.localTranscribe.emptyTranscription`: existing i18n key for empty result — silence detection needs a separate key ("No speech detected").

### Established Patterns
- Inline elements next to buttons: SpeechRecognitionButton uses `Group wrap="nowrap"` with ActionIcon + Menu chevron. Timer can follow similar inline pattern.
- Worker communication: `{ status: string, ... }` message format. New `silence` status fits naturally.
- State-conditional rendering: button already conditionally shows different states (idle/recording/transcribing). Timer visibility follows same pattern.

### Integration Points
- `LocalTranscribeButton.tsx` — Add timer display and privacy badge to the component or its container.
- `useLocalTranscribe.ts` — Expose `elapsedMs` or `elapsedSeconds` as part of return value.
- `whisper.worker.ts:75-100` — `transcribe` handler needs RMS check before `transcriber(audio, ...)` call and hallucination filter after.
- `ChatInput.tsx` — May need minor adjustments for timer/badge layout alongside the button.

</code_context>

<specifics>
## Specific Ideas

- Timer format "0:42 / 2:00" matches the success criteria exactly. Red color in last 15 seconds adds urgency before auto-stop toast.
- Privacy badge as a persistent small chip creates trust without requiring user interaction — especially important since the local transcription feature's core value proposition is privacy.
- Two-layer silence detection: RMS energy check catches obvious silence fast (no wasted compute), hallucination filter catches edge cases where background noise passes the energy threshold but contains no speech.
- Worker returns `{ status: 'silence' }` — hook maps this to the silence-specific toast, distinct from the existing empty transcription message.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 5-Polish & Refinement*
*Context gathered: 2026-05-08*
