# Phase 3: UI Integration - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the user-facing components for local transcription in the chat interface: a LocalTranscribeButton with language selection, a download progress banner for first-time model download, and the wiring in ChatInput.tsx to connect the `useLocalTranscribe` hook (built in Phase 2) to these UI components. All UI text must be available in de/en with accessibility labels.

</domain>

<decisions>
## Implementation Decisions

### Download Progress UX
- **D-01:** Download progress appears as a **banner above the ChatInput area**, spanning full width. Not inline with the button.
- **D-02:** Banner shows **progress bar + percentage + MB** (e.g., "45% — 63 MB / 140 MB"). Full detail for the ~140MB download.
- **D-03:** Banner includes a **cancel button** (X) to abort the download. Button returns to idle state on cancel. User can retry by clicking the mic again.
- **D-04:** After download completes, banner shows a **brief "Ready" confirmation (1-2 seconds)**, then auto-starts recording. Gives the user a moment to prepare.
- **D-05:** The banner is **only shown during the `downloading` state** (fresh download). Cache loading (`loading` state, typically 1-3s) does **not** show the banner — only a spinner on the button itself.

### Language Dropdown Behavior
- **D-06:** Language state initializes from the assistant's `defaultLanguage` extension config (set by admin in Phase 1). **Session-only** — resets per page load. Matches existing `speechLanguage` pattern in ChatInput.
- **D-07:** Language options displayed as **code only** ('de' / 'en') in the dropdown. Compact, consistent with SpeechRecognitionButton style.
- **D-08:** Language dropdown is **disabled during recording and transcribing** states. Changing language mid-recording would be confusing. Matches SpeechRecognitionButton behavior.

### Button Visual States
- **D-09:** On mount (cache pre-load): button shows **normal mic icon immediately**. No visible loading state on mount. If user clicks before model is ready, the hook queues recording automatically (D-04 from Phase 2).
- **D-10:** Downloading state: button is **disabled** while the download banner (D-01) handles progress visualization. No special download indicator on the button itself.
- **D-11:** Recording state: **exact match to TranscribeButton** — red filled variant + `animate-pulse`. All recording looks the same regardless of which extension is active.
- **D-12:** Transcribing state: uses **Mantine `loading` prop** on ActionIcon (spinner replaces mic icon, button disabled). Same as TranscribeButton.
- **D-13:** Error state: button **returns to idle**. Errors communicated via toast notifications only (already implemented in hook). No persistent error indicator on the button.

### Component Composition
- **D-14:** LocalTranscribeButton follows the **SpeechRecognitionButton layout** — mic ActionIcon on left + small chevron dropdown on right, wrapped in a Mantine Group. Identical visual structure.
- **D-15:** Download progress banner is a **separate `DownloadProgressBanner` component** rendered conditionally in ChatInput, above the textarea. Clean separation from the button component.
- **D-16:** New component files live in `frontend/src/pages/chat/conversation/` alongside existing buttons: `LocalTranscribeButton.tsx` and `DownloadProgressBanner.tsx`.

### Claude's Discretion
- ChatInput.tsx wiring details (conditional rendering logic for showing the correct button component)
- Exact Tailwind/CSS classes for the download banner (consistent with existing app styling)
- i18n key naming within the `texts.chat.localTranscribe.*` namespace (some keys already exist from Phase 2)
- Accessibility label text and ARIA roles for new components
- Internal prop interfaces for LocalTranscribeButton and DownloadProgressBanner

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing UI Components (pattern templates)
- `frontend/src/pages/chat/conversation/SpeechRecognitionButton.tsx` — Layout template: mic + chevron dropdown with Mantine Group/Menu. LocalTranscribeButton MUST follow this exact visual structure.
- `frontend/src/pages/chat/conversation/TranscribeButton.tsx` — Visual state template: red filled + pulse during recording, Mantine loading prop during transcribing. LocalTranscribeButton MUST match these states.
- `frontend/src/pages/chat/conversation/ChatInput.tsx` §174-305 — Integration point: voice extension filtering (line 181 already includes `transcribe-local`), language state management, button rendering area (line 294-305).

### Hook Interface (Phase 2 output)
- `frontend/src/hooks/useLocalTranscribe.ts` — Hook providing `state`, `downloadProgress`, `isRecording`, `isTranscribing`, `isDownloading`, `toggleRecording`. This is the data source for all UI states.

### Extension Config
- `backend/src/extensions/other/local-transcribe.ts` — Phase 1 extension with `defaultLanguage` config field (select: de/en). Source of language default.

### i18n
- `frontend/src/texts/languages/en.ts` §191-204 — Existing `localTranscribe` keys (error/status messages). New keys needed for download progress display and banner text.
- `frontend/src/texts/languages/de.ts` §194-208 — German translations, same structure.

### Project Requirements
- `.planning/REQUIREMENTS.md` §UI-Komponenten — UI-01, UI-02, UI-03, UI-04, UI-07
- `.planning/REQUIREMENTS.md` §Modell-Management — MODEL-03, MODEL-04
- `.planning/REQUIREMENTS.md` §Internationalisierung — I18N-01, I18N-02

### Phase 2 Context
- `.planning/phases/02-core-transcription-pipeline/02-CONTEXT.md` — Prior decisions on hook API contract (D-07 to D-11), especially state machine and download progress exposure.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SpeechRecognitionButton` layout: Mantine `Group` + `ActionIcon` + `Menu` pattern with chevron dropdown — directly reusable as structural template for LocalTranscribeButton.
- `TranscribeButton` visual states: red filled variant + `animate-pulse` for recording, `loading` prop for transcribing — exact patterns to replicate.
- `useLocalTranscribe` hook: fully built in Phase 2, exposes all needed state and actions. No additional hook logic needed.
- `texts.chat.localTranscribe.*` i18n keys: error and status messages already exist. Need to add download banner text and language-related labels.

### Established Patterns
- Voice extension rendering in ChatInput uses conditional chain: `showSpeechToText ? <SpeechRecognitionButton/> : showTranscribe ? <TranscribeButton/> : null`. LocalTranscribe will extend this chain.
- Language state (`speechLanguage`) managed as local state in ChatInput with `useState`. Same pattern for local transcribe language.
- Extension config access: `configuration?.extensions?.filter(...)` in ChatInput provides extension metadata including config values.

### Integration Points
- `ChatInput.tsx:181` — `transcribe-local` already in the filter. Need to add `showLocalTranscribe` boolean and render `LocalTranscribeButton` in the conditional chain at line 295.
- `ChatInput.tsx:189-193` — Need to add `useLocalTranscribe` hook call (similar to how `useTranscribe` is called for azure).
- `frontend/src/pages/chat/conversation/` — New files: `LocalTranscribeButton.tsx`, `DownloadProgressBanner.tsx`.
- i18n files: new keys under `texts.chat.localTranscribe.*` for banner text, ready confirmation, cancel label.

</code_context>

<specifics>
## Specific Ideas

- The download banner with cancel button and "Ready" confirmation creates a guided first-time experience. User clicks mic → sees download progress → brief "Ready!" → recording starts automatically.
- Language dropdown uses code-only labels ('de' / 'en') for compact appearance, matching the existing SpeechRecognitionButton's minimal style.
- Cache loading is invisible — button appears ready immediately on subsequent visits. Only first-time download gets the full banner treatment.
- Error handling is toast-only with immediate return to idle — no persistent error states cluttering the UI.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 3-UI Integration*
*Context gathered: 2026-05-07*
