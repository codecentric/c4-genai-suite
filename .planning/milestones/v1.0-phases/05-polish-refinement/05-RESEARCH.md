# Phase 5: Polish & Refinement - Research

**Researched:** 2026-05-08
**Domain:** Frontend UI polish (recording timer, privacy badge) + Worker-level silence detection
**Confidence:** HIGH

## Summary

Phase 5 adds three production-readiness features to the existing local transcription pipeline: (1) a recording timer showing elapsed time relative to the 2-minute maximum, (2) a privacy badge communicating local-only audio processing, and (3) two-layer silence detection (pre-transcription RMS energy check + post-transcription hallucination filtering) that returns a "No speech detected" message instead of Whisper hallucination text.

All changes are frontend-only, modifying four existing files (`useLocalTranscribe.ts`, `whisper.worker.ts`, `LocalTranscribeButton.tsx`, `ChatInput.tsx`) and two i18n files (`en.ts`, `de.ts`). No backend changes, no new dependencies, no database migrations. The hook already tracks recording start time via `startTimeRef` and a 100ms `setInterval` -- the timer feature exposes this as reactive state. The Worker already receives `Float32Array` audio data -- silence detection adds an RMS check before transcription and a hallucination filter after.

**Primary recommendation:** Implement in three workstreams: (A) hook + timer UI, (B) Worker silence detection, (C) privacy badge + i18n keys. All three are independently testable. Existing test infrastructure (vitest with 151 passing tests) covers both the hook and Worker with thorough mocking patterns that extend naturally for the new features.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Timer displays inline next to the mic button (to the left of LocalTranscribeButton), at the same height. Visible only during recording state. Shows format "0:42 / 2:00" (elapsed / maximum).
- **D-02:** Timer text turns red when approaching the 2-minute limit (e.g., last 15 seconds) as a visual warning before auto-stop. Normal color before that threshold.
- **D-03:** The `useLocalTranscribe` hook exposes elapsed time -- the existing `startTimeRef` and 100ms `setInterval` timer already track recording duration. Expose as a reactive value for UI consumption.
- **D-04:** Privacy indicator is a small text badge with a shield/lock icon and "Local" text, rendered near the LocalTranscribeButton.
- **D-05:** Badge is always visible when the local transcription extension is active on the assistant -- not just during recording. Provides constant privacy reassurance.
- **D-06:** Badge communicates that audio is processed locally and never leaves the browser. Exact wording needs i18n keys in de/en.
- **D-07:** Silence detection uses two layers: pre-transcription audio energy check (RMS analysis on Float32Array) AND post-transcription hallucination filtering.
- **D-08:** Both checks run in the Worker. Worker receives audio, checks RMS energy first. If below threshold, returns a `silence` status code immediately (skips transcription). If above threshold, transcribes and then filters output for known hallucination patterns.
- **D-09:** Hallucination patterns to filter: very short nonsensical text, repetitive phrases, known Whisper silence hallucinations. Worker returns `silence` status code when detected.
- **D-10:** Main thread handles `silence` status code the same as empty transcription: shows toast.info with "Keine Sprache erkannt" / "No speech detected" message (ERR-05), returns to idle state.

### Claude's Discretion
- Exact RMS energy threshold value for pre-transcription silence check (tunable constant in Worker)
- Specific hallucination pattern list and matching algorithm (regex, substring, or scoring)
- Timer component implementation details (separate component or inline in LocalTranscribeButton)
- Exact Tailwind/CSS styling for timer text and privacy badge
- Red threshold timing for timer (last 15 seconds suggested, Claude can adjust)
- Shield vs lock icon choice for privacy badge
- i18n key naming for new keys within `texts.chat.localTranscribe.*` namespace

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-05 | Recording-Timer zeigt vergangene Zeit an (z.B. "0:42 / 2:00") | Hook already tracks `startTimeRef` + 100ms interval. Expose `elapsedSeconds` as `useState`, derive from existing interval. RecordingTimer component receives props. UI-SPEC defines visual contract. |
| UI-06 | Privacy-Badge/Indikator zeigt an, dass Audio lokal verarbeitet wird | IconShieldCheck confirmed available in @tabler/icons-react. Badge renders when `showLocalTranscribe && localTranscribeHook.isSupported`. UI-SPEC defines visual contract. 4 new i18n keys needed. |
| ERR-05 | Stille erkannt (kein Sprachsignal) -> "Keine Sprache erkannt" statt Whisper-Halluzination | RMS energy check on Float32Array (threshold ~0.01), hallucination pattern filter (documented list from Whisper research). Worker returns `{ status: 'silence' }`. Hook maps to toast.info. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Recording timer display | Browser / Client | -- | Pure UI state derived from existing hook timer. No server involvement. |
| Elapsed time tracking | Browser / Client | -- | Already tracked in `useLocalTranscribe` via `startTimeRef` + `setInterval`. Needs exposure as reactive state. |
| Privacy badge display | Browser / Client | -- | Static UI element conditional on extension config (already available client-side from API response). |
| RMS energy silence detection | Browser / Client (Worker) | -- | Runs entirely in Web Worker on Float32Array audio data before transcription. No network calls. |
| Hallucination text filtering | Browser / Client (Worker) | -- | Post-transcription string matching in Worker. No server involvement. |
| i18n text additions | Browser / Client | -- | Static key additions to existing language files. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.5 | UI rendering | Project standard [VERIFIED: package.json] |
| Tailwind CSS | 4.1.18 | Utility-first styling | Project standard [VERIFIED: package.json] |
| Mantine | 9.1.0 | UI component library (ActionIcon, Group) | Project standard [VERIFIED: package.json] |
| @tabler/icons-react | 3.41.1 (installed), 3.43.0 (latest) | Icon library (IconShieldCheck) | Project standard [VERIFIED: package.json, npm registry] |
| react-toastify | 11.0.3 | Toast notifications | Project standard, already used for silence toast pattern [VERIFIED: package.json] |
| vitest | 4.1.4 | Unit testing | Project standard [VERIFIED: package.json] |
| @testing-library/react | 16.3.2 | React testing utilities | Project standard [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/jest-dom | 6.9.1 | DOM assertion matchers | Test assertions [VERIFIED: package.json] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| RMS energy check | Web Audio API AnalyserNode | AnalyserNode requires AudioContext on main thread; RMS on Float32Array in Worker is simpler and avoids main thread audio processing |
| String-based hallucination filter | Whisper's `no_speech_threshold` parameter | Transformers.js pipeline does not expose Whisper's internal `no_speech_prob` score; string filtering is the practical fallback |

**Installation:**
```bash
# No new packages needed. All dependencies already installed.
```

## Architecture Patterns

### System Architecture Diagram

```
User clicks mic -> [MediaRecorder] -> audioChunks (Blob[])
                                           |
                                    [resampleToMono16kHz]
                                           |
                                    Float32Array (16kHz mono)
                                           |
                              postMessage(transferable)
                                           |
                                    [Web Worker]
                                           |
                              +--- RMS energy check ---+
                              |                        |
                         RMS < 0.01               RMS >= 0.01
                              |                        |
                     { status: 'silence' }    [Whisper transcribe]
                                                       |
                                           +--- Hallucination filter ---+
                                           |                            |
                                      matches pattern            clean text
                                           |                            |
                                  { status: 'silence' }      { status: 'result', text }
                                           |                            |
                              +------------+----------------------------+
                              |
                    [useLocalTranscribe hook]
                              |
                    +-------- switch(status) --------+
                    |                                |
              'silence'                         'result'
                    |                                |
        toast.info("No speech          onTranscriptReceived(text)
         detected")                          |
                    |                   setText(input)
              setState('idle')               |
                                       setState('idle')


Timer: [startTimeRef] --100ms interval--> [elapsedSeconds state] --> <RecordingTimer />
Badge: [showLocalTranscribe && isSupported] --> <PrivacyBadge /> (always visible)
```

### Component Responsibilities

| Component/File | Responsibility | Changes in Phase 5 |
|----------------|---------------|---------------------|
| `useLocalTranscribe.ts` | Hook managing recording state machine | Add `elapsedSeconds` state, handle `silence` Worker status |
| `whisper.worker.ts` | Web Worker for Whisper inference | Add RMS energy check, hallucination filter, `silence` status |
| `LocalTranscribeButton.tsx` | Mic button with recording states | No changes needed (timer/badge render in ChatInput) |
| `ChatInput.tsx` | Chat input with button row | Add RecordingTimer + PrivacyBadge conditional rendering |
| `RecordingTimer.tsx` (new) | Timer display component | New component: `elapsedSeconds`, `maxSeconds` props |
| `PrivacyBadge.tsx` (new) | Privacy indicator badge | New component: shield icon + "Local" text + tooltip |
| `en.ts` / `de.ts` | i18n language files | Add 4 new keys each under `localTranscribe` |

### Recommended Project Structure
```
frontend/src/
├── hooks/
│   └── useLocalTranscribe.ts           # Modified: add elapsedSeconds, handle 'silence'
├── workers/
│   └── whisper.worker.ts               # Modified: add RMS check + hallucination filter
├── pages/chat/conversation/
│   ├── ChatInput.tsx                   # Modified: render RecordingTimer + PrivacyBadge
│   ├── LocalTranscribeButton.tsx       # Unchanged
│   ├── RecordingTimer.tsx              # New: timer display component
│   └── PrivacyBadge.tsx               # New: privacy badge component
└── texts/languages/
    ├── en.ts                           # Modified: 4 new i18n keys
    └── de.ts                           # Modified: 4 new i18n keys
```

### Pattern 1: Exposing Elapsed Time as Reactive State
**What:** Convert the existing `startTimeRef` + 100ms `setInterval` pattern in `useLocalTranscribe` into a `useState<number>` that updates every second (not every 100ms, to avoid unnecessary re-renders).
**When to use:** When internal ref-based timing needs to drive UI rendering.
**Example:**
```typescript
// Source: useLocalTranscribe.ts existing pattern + new addition
const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

// Inside the existing 100ms interval callback:
timerRef.current = window.setInterval(() => {
  const elapsed = Date.now() - startTimeRef.current;
  // Update elapsed seconds (whole seconds only, avoids excessive re-renders)
  setElapsedSeconds(Math.floor(elapsed / 1000));
  if (elapsed >= maxDurationMsRef.current) {
    // existing auto-stop logic...
  }
}, 100);
```
[VERIFIED: useLocalTranscribe.ts lines 38-39, 101-114]

### Pattern 2: Worker Status Extension
**What:** Add a new `silence` status to the Worker message protocol alongside existing `ready`, `result`, `error`.
**When to use:** When Worker needs to communicate a new outcome type.
**Example:**
```typescript
// Source: whisper.worker.ts transcribe handler extension
if (type === 'transcribe') {
  const audio = event.data.audio;
  if (!audio) { /* existing error handling */ return; }

  // Layer 1: RMS energy check
  const rms = computeRMS(audio);
  if (rms < SILENCE_RMS_THRESHOLD) {
    self.postMessage({ status: 'silence' });
    return;
  }

  // Existing transcription...
  const result = await transcriber(audio, { language, task: 'transcribe' });
  const text = (Array.isArray(result) ? result[0] : result).text.trim();

  // Layer 2: Hallucination filter
  if (isHallucination(text)) {
    self.postMessage({ status: 'silence' });
    return;
  }

  self.postMessage({ status: 'result', text });
}
```
[VERIFIED: whisper.worker.ts lines 75-101]

### Pattern 3: Conditional Inline Rendering in ChatInput
**What:** Render RecordingTimer and PrivacyBadge conditionally in the button row.
**When to use:** Adding new inline elements next to existing buttons.
**Example:**
```typescript
// Source: ChatInput.tsx line 312-334 pattern
<div className="flex items-center gap-1">
  {showLocalTranscribe && localTranscribeHook.isSupported && (
    <>
      <PrivacyBadge />
      {localTranscribeHook.isRecording && (
        <RecordingTimer
          elapsedSeconds={localTranscribeHook.elapsedSeconds}
          maxSeconds={120}
        />
      )}
      <LocalTranscribeButton {...existingProps} />
    </>
  )}
  {/* existing submit button */}
</div>
```
[VERIFIED: ChatInput.tsx lines 312-346]

### Anti-Patterns to Avoid
- **Re-rendering every 100ms for timer:** The interval fires at 100ms for auto-stop precision, but the timer UI only needs whole-second updates. Use `Math.floor(elapsed / 1000)` and only update state when the second changes, not on every tick.
- **Running Whisper on silence:** Without the RMS pre-check, Whisper will process silent audio and produce hallucination text. The RMS check saves significant compute time (~2-5 seconds of inference on WASM).
- **Hardcoding hallucination strings without escape:** Some hallucination patterns contain special regex characters (e.g., `...`, `(music)`). Use escaped strings or simple `includes()` checks rather than unescaped regex.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom notification system | `react-toastify` `toast.info()` | Already the project standard; handles aria-live, auto-dismiss, stacking |
| Icon rendering | SVG inline icons | `@tabler/icons-react` IconShieldCheck | Consistent with project, tree-shakeable, accessible |
| Tooltip system | Custom tooltip component | Existing `data-tooltip-id="default"` pattern | Project already has tooltip infrastructure wired up |
| Timer formatting | Complex date/time library | Simple `Math.floor(s/60) + ":" + String(s%60).padStart(2,"0")` | Timer is M:SS format only; a library would be massive overkill |

**Key insight:** All UI primitives needed for this phase are already available in the project's existing stack. No new dependencies required.

## Common Pitfalls

### Pitfall 1: Timer Re-render Thrashing
**What goes wrong:** Setting `elapsedSeconds` state on every 100ms interval tick causes 10 re-renders per second for the entire ChatInput subtree.
**Why it happens:** The existing interval runs at 100ms for auto-stop precision. Naively updating state on every tick propagates unnecessary renders.
**How to avoid:** Only call `setElapsedSeconds()` when the whole-second value changes. Compare `Math.floor(elapsed / 1000)` against the current value before updating.
**Warning signs:** Visible jank in the chat input area during recording; React DevTools showing excessive re-renders of ChatInput.

### Pitfall 2: RMS Threshold Too Aggressive
**What goes wrong:** Setting the RMS threshold too high (e.g., 0.05) causes quiet speech to be classified as silence. Too low (e.g., 0.001) lets actual silence through to Whisper.
**Why it happens:** Microphone gain varies dramatically across devices. Laptop built-in mics produce much lower signal levels than desktop microphones.
**How to avoid:** Start with `0.01` as the threshold constant. Make it a named constant (`SILENCE_RMS_THRESHOLD`) at the top of the Worker file so it can be tuned easily. Document that this value may need adjustment based on real-world testing. [ASSUMED]
**Warning signs:** Users reporting "No speech detected" when speaking quietly; or hallucination text still appearing for silence.

### Pitfall 3: Whisper Hallucination Patterns Are Language-Dependent
**What goes wrong:** English-only hallucination filter misses German hallucinations like "Untertitel im Auftrag des ZDF" or "Untertitel".
**Why it happens:** Whisper's hallucination outputs depend on the transcription language parameter. The model was trained on video data with language-specific subtitle credits.
**How to avoid:** Include both English AND German hallucination patterns in the filter list, since the app supports both languages. Key German patterns: "Untertitel", "Untertitel im Auftrag des ZDF", "Vielen Dank". Key English patterns: "Thank you.", "Thanks for watching.", "Thank you for watching.", "Subtitles by", "(music)", "(silence)", "You", "...". [CITED: github.com/openai/whisper/discussions/679, github.com/openai/whisper/discussions/1606, huggingface.co/datasets/sachaarbonel/whisper-hallucinations]
**Warning signs:** Hallucination text appearing in the chat input after recording silence.

### Pitfall 4: Stale Elapsed Seconds After Recording Stops
**What goes wrong:** `elapsedSeconds` state retains the last recording value (e.g., 45) after recording stops. If the timer component checks visibility based on state rather than hook's `isRecording`, the timer may briefly flash old values on next recording start.
**Why it happens:** React state persists across renders. The cleanup function clears the interval but doesn't reset the elapsed time.
**How to avoid:** Reset `elapsedSeconds` to 0 in the cleanup function and when transitioning away from `recording` state. Also reset it at the start of `beginRecording`.
**Warning signs:** Timer briefly showing "0:45 / 2:00" at the start of a new recording before updating to "0:00 / 2:00".

### Pitfall 5: Hallucination Filter False Positives
**What goes wrong:** Legitimate short transcriptions (e.g., user says "Hi" or "Yes") get filtered as hallucinations because they match the "text length <= 5" check.
**Why it happens:** The length-based filter is too broad. Short real speech exists.
**How to avoid:** Combine length check with content check. Don't filter "Hi", "Yes", "Ja", "Nein" etc. Use a stricter approach: filter only when (a) text is very short AND matches a known hallucination pattern, OR (b) text matches a known hallucination string exactly. A length-only filter will cause false positives.
**Warning signs:** Users saying short words and getting "No speech detected" instead of the word.

### Pitfall 6: tabular-nums Not Working in Tailwind 4
**What goes wrong:** The `tabular-nums` class from the UI-SPEC may not be available as a utility class in Tailwind CSS 4.
**Why it happens:** Tailwind 4 changed how font-feature-settings utilities work compared to v3.
**How to avoid:** Use inline style `style={{ fontVariantNumeric: 'tabular-nums' }}` as a reliable fallback, or verify the class works in the dev environment before committing.
**Warning signs:** Timer digits causing layout shift as numbers change width (e.g., "1" is narrower than "0" in proportional fonts).

## Code Examples

### RMS Energy Calculation for Float32Array
```typescript
// Source: Standard audio signal processing formula
// [CITED: deepwiki.com/ahmedayman9/Audio-Silence-Detection-and-Pause-Percentage-Calculation/5.3-rms-energy-analysis]
const SILENCE_RMS_THRESHOLD = 0.01;

function computeRMS(samples: Float32Array): number {
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSquares += samples[i] * samples[i];
  }
  return Math.sqrt(sumSquares / samples.length);
}
```

### Hallucination Pattern Filter
```typescript
// Source: Whisper hallucination research
// [CITED: github.com/openai/whisper/discussions/679, /1606, huggingface.co/datasets/sachaarbonel/whisper-hallucinations]
const HALLUCINATION_PATTERNS: string[] = [
  // English
  'Thank you.',
  'Thank you for watching.',
  'Thanks for watching.',
  'Thank you for watching!',
  'Thanks for watching!',
  'Subtitles by',
  'Subtitles made by',
  'subtitles by the amara.org community',
  'Amara.org',
  '(music)',
  '(Music)',
  '(silence)',
  '(Silence)',
  'You',
  'you',
  'Bye.',
  'Bye!',
  'Goodbye.',
  // German
  'Untertitel',
  'Untertitel im Auftrag des ZDF',
  'Untertitel von',
  'Vielen Dank.',
  'Vielen Dank!',
  'Tschüss.',
  'SWR 2020',
  'SWR 2021',
];

function isHallucination(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;

  // Exact match against known patterns (case-insensitive)
  if (HALLUCINATION_PATTERNS.some(p => trimmed.toLowerCase() === p.toLowerCase())) {
    return true;
  }

  // Single punctuation or ellipsis
  if (/^[.!?,;:…]+$/.test(trimmed)) return true;

  // Repetitive pattern: same word/phrase repeated 3+ times
  const words = trimmed.split(/\s+/);
  if (words.length >= 3 && words.every(w => w === words[0])) return true;

  return false;
}
```

### RecordingTimer Component
```typescript
// Source: UI-SPEC Phase 5
// [VERIFIED: 05-UI-SPEC.md RecordingTimer section]
interface RecordingTimerProps {
  elapsedSeconds: number;
  maxSeconds: number;
}

function RecordingTimer({ elapsedSeconds, maxSeconds }: RecordingTimerProps) {
  const WARNING_THRESHOLD = maxSeconds - 15;
  const isWarning = elapsedSeconds >= WARNING_THRESHOLD;

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <span
      className={`text-xs font-semibold ${isWarning ? 'text-red-600' : 'text-gray-600'}`}
      style={{ fontVariantNumeric: 'tabular-nums' }}
      aria-label={texts.chat.localTranscribe.timerLabel}
      aria-live="off"
    >
      {formatTime(elapsedSeconds)} / {formatTime(maxSeconds)}
    </span>
  );
}
```

### PrivacyBadge Component
```typescript
// Source: UI-SPEC Phase 5
// [VERIFIED: 05-UI-SPEC.md PrivacyBadge section]
import { IconShieldCheck } from '@tabler/icons-react';

function PrivacyBadge() {
  return (
    <span
      className="flex items-center gap-1"
      data-tooltip-id="default"
      data-tooltip-content={texts.chat.localTranscribe.privacyTooltip}
      tabIndex={0}
    >
      <IconShieldCheck size={14} className="text-green-700" />
      <span className="text-sm text-green-700">
        {texts.chat.localTranscribe.privacyBadge}
      </span>
    </span>
  );
}
```

### Hook Silence Status Handler
```typescript
// Source: useLocalTranscribe.ts existing switch pattern
// [VERIFIED: useLocalTranscribe.ts lines 136-217]
case 'silence': {
  toast.info(texts.chat.localTranscribe.silenceDetected);
  setState('idle');
  break;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Whisper `no_speech_threshold` parameter | Pre-transcription RMS + post-transcription filter | Transformers.js does not expose `no_speech_prob` | Must implement both layers in Worker code |
| SileroVAD for silence detection | RMS energy check (simpler) | N/A | SileroVAD is a separate ONNX model (~2MB); RMS is zero-dependency and sufficient for this use case |
| Tailwind v3 `tabular-nums` utility | Tailwind v4 may require inline style | Tailwind 4.x | Use `style={{ fontVariantNumeric: 'tabular-nums' }}` for reliability |

**Deprecated/outdated:**
- Web Audio `ScriptProcessorNode`: Deprecated in favor of `AudioWorklet`. Not relevant here since RMS runs on the already-captured Float32Array in the Worker, not on a live audio stream.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | RMS threshold of 0.01 is appropriate for silence detection across typical microphones | Common Pitfalls / Code Examples | False positives (quiet speech rejected) or false negatives (silence passes through). Mitigated by making it a tunable constant. |
| A2 | `tabular-nums` CSS property works via inline style in all target browsers | Common Pitfalls | Minor: timer digits may cause tiny layout shifts. All modern browsers support `font-variant-numeric`. |
| A3 | The hallucination pattern list covers the most common Whisper silence outputs for en/de | Code Examples | Some rare hallucination patterns may slip through. List can be extended post-release. |

## Open Questions

1. **RMS threshold calibration**
   - What we know: 0.01 is a commonly cited threshold for silence detection. Actual microphone sensitivity varies widely.
   - What's unclear: Whether 0.01 works well across laptop built-in mics, headset mics, and desktop mics in the project's target environment.
   - Recommendation: Start with 0.01 as a named constant. Tune based on manual testing. Consider logging the RMS value during development to calibrate.

2. **Hallucination filter completeness**
   - What we know: The Hugging Face whisper-hallucinations dataset documents common patterns. English and German patterns are identified.
   - What's unclear: Whether the whisper-small model (used in this project) produces different hallucination patterns than whisper-base/large.
   - Recommendation: Start with the documented pattern list. Monitor user reports for unfiltered hallucinations and extend the list iteratively.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.4 |
| Config file | `frontend/vite.config.ts` (test section, lines 18-38) |
| Quick run command | `cd frontend && npx vitest run` |
| Full suite command | `cd frontend && npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-05 | Hook exposes `elapsedSeconds` that updates during recording | unit | `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts -t "elapsedSeconds"` | Extends existing file |
| UI-05 | RecordingTimer renders elapsed/max format | unit | `cd frontend && npx vitest run src/pages/chat/conversation/RecordingTimer.ui-unit.spec.tsx` | Wave 0 |
| UI-05 | RecordingTimer turns red at warning threshold | unit | `cd frontend && npx vitest run src/pages/chat/conversation/RecordingTimer.ui-unit.spec.tsx -t "warning"` | Wave 0 |
| UI-06 | PrivacyBadge renders with shield icon and text | unit | `cd frontend && npx vitest run src/pages/chat/conversation/PrivacyBadge.ui-unit.spec.tsx` | Wave 0 |
| ERR-05 | Worker returns silence when RMS below threshold | unit | `cd frontend && npx vitest run src/workers/whisper.worker.ui-unit.spec.ts -t "silence"` | Extends existing file |
| ERR-05 | Worker returns silence for hallucination patterns | unit | `cd frontend && npx vitest run src/workers/whisper.worker.ui-unit.spec.ts -t "hallucination"` | Extends existing file |
| ERR-05 | Hook handles silence status with toast.info | unit | `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts -t "silence"` | Extends existing file |

### Sampling Rate
- **Per task commit:** `cd frontend && npx vitest run`
- **Per wave merge:** `cd frontend && npx vitest run`
- **Phase gate:** Full suite green (151+ tests) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `frontend/src/pages/chat/conversation/RecordingTimer.ui-unit.spec.tsx` -- covers UI-05 (timer rendering, format, warning color)
- [ ] `frontend/src/pages/chat/conversation/PrivacyBadge.ui-unit.spec.tsx` -- covers UI-06 (badge rendering, icon, tooltip)

Existing test files that need extension (not Wave 0, extend during implementation):
- `frontend/src/hooks/useLocalTranscribe.ui-unit.spec.ts` -- add tests for `elapsedSeconds` state and `silence` status handling
- `frontend/src/workers/whisper.worker.ui-unit.spec.ts` -- add tests for RMS check, hallucination filter, `silence` status

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | -- |
| V3 Session Management | no | -- |
| V4 Access Control | no | -- |
| V5 Input Validation | yes | Hallucination filter validates Worker output before inserting into UI. RMS threshold validates audio energy before processing. |
| V6 Cryptography | no | -- |

### Known Threat Patterns for Frontend Audio Processing

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via transcription text | Tampering | Transcription text is set via React's `setText()` which auto-escapes. No `dangerouslySetInnerHTML` used. |
| Worker message injection | Tampering | Worker runs same-origin code only. Messages validated by type-safe switch statement in hook. |

## Project Constraints (from CLAUDE.md)

- **Frontend stack:** React 19 + TypeScript + Vite, Mantine UI, Tailwind CSS, Zustand, TanStack Query
- **Testing:** Frontend unit tests via vitest. Test file naming convention: `*.ui-unit.spec.ts(x)` or `*.integration.spec.*`
- **Linting:** ESLint + Prettier (`cd frontend && npm run lint && npm run format`)
- **Commit format:** `<type>(<scope>): <subject>` -- types: feat, fix, refactor, test; scopes: frontend
- **i18n files:** `frontend/src/texts/languages/` -- en.ts and de.ts
- **No manual edits** to `frontend/src/api/generated/` (auto-generated)
- **Node.js 24** (.nvmrc)

## Sources

### Primary (HIGH confidence)
- `frontend/src/hooks/useLocalTranscribe.ts` -- full source reviewed, lines 1-372
- `frontend/src/workers/whisper.worker.ts` -- full source reviewed, lines 1-102
- `frontend/src/pages/chat/conversation/LocalTranscribeButton.tsx` -- full source reviewed, lines 1-92
- `frontend/src/pages/chat/conversation/ChatInput.tsx` -- integration point reviewed, lines 170-364
- `frontend/src/texts/languages/en.ts` lines 191-212 -- existing i18n keys
- `frontend/src/texts/languages/de.ts` lines 194-216 -- existing i18n keys
- `frontend/src/hooks/useLocalTranscribe.ui-unit.spec.ts` -- full test suite reviewed (24 tests)
- `frontend/src/workers/whisper.worker.ui-unit.spec.ts` -- full test suite reviewed (14 tests)
- `05-UI-SPEC.md` -- approved visual and interaction contracts
- `05-CONTEXT.md` -- user decisions D-01 through D-10
- npm registry -- @tabler/icons-react 3.43.0, vitest 4.1.5 (project uses 4.1.4)
- IconShieldCheck export verified at `node_modules/@tabler/icons-react/dist/esm/icons/IconShieldCheck.mjs`

### Secondary (MEDIUM confidence)
- [Whisper hallucination discussion #679](https://github.com/openai/whisper/discussions/679) -- hallucination patterns, German "Untertitel" examples
- [Whisper hallucination discussion #1606](https://github.com/openai/whisper/discussions/1606) -- subtitle attribution patterns, language-dependent hallucinations
- [Whisper hallucinations dataset](https://huggingface.co/datasets/sachaarbonel/whisper-hallucinations) -- systematic collection of hallucination phrases by language
- [RMS Energy Analysis](https://deepwiki.com/ahmedayman9/Audio-Silence-Detection-and-Pause-Percentage-Calculation/5.3-rms-energy-analysis) -- RMS formula and threshold guidance

### Tertiary (LOW confidence)
- None. All findings verified against primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries verified against project package.json and npm registry
- Architecture: HIGH -- all integration points verified by reading existing source code
- Pitfalls: HIGH for timer/badge pitfalls (standard React patterns); MEDIUM for RMS threshold and hallucination filter completeness (requires real-world testing)

**Research date:** 2026-05-08
**Valid until:** 2026-06-07 (30 days -- stable domain, no fast-moving dependencies)
