# Phase 4: Error Handling - Research

**Researched:** 2026-05-08
**Domain:** Browser capability detection, Web Worker error communication, toast notifications, i18n
**Confidence:** HIGH

## Summary

Phase 4 adds graceful failure modes to the local transcription feature. The work is predominantly in three files: `useLocalTranscribe.ts` (hook logic), `whisper.worker.ts` (error detection in Worker), and `ChatInput.tsx` (conditional rendering). Supporting changes go into i18n files (`en.ts`, `de.ts`).

ERR-01 (mic permission denied) is already implemented and needs no changes. ERR-02 (browser compatibility) requires a new `isSupported` flag in the hook with a four-check capability detection that gates Worker initialization and button rendering. ERR-03 (download failure) requires the Worker to detect network failure types (offline, timeout, generic) and send typed error codes to the main thread, where the hook maps them to specific i18n keys. ERR-04 (empty transcription) requires a `text.trim()` check in the result handler that shows `toast.info()` instead of inserting empty text. A supplementary change (D-06) adds `toast.info()` to the existing `cancelDownload` function.

There are 4 failing tests in the existing `useLocalTranscribe.ui-unit.spec.ts` that assume the hook pre-loads the model on mount (state starts as 'loading'). The actual hook initializes to 'idle' with lazy loading on first click. These tests must be fixed as part of this phase since the phase adds new test cases that depend on correct initial state assumptions.

**Primary recommendation:** Implement changes in two waves: Wave 1 covers all code changes (Worker error codes, hook capability detection + error mapping + empty result check, ChatInput conditional rendering, i18n keys, cancel toast); Wave 2 covers test updates (fix 4 broken tests, add new tests for ERR-02/03/04/D-06).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Full capability check before showing the button: `Worker` + `WebAssembly` + `navigator.mediaDevices.getUserMedia` + `self.crossOriginIsolated` (SharedArrayBuffer). All four must be present.
- **D-02:** When any capability is missing, the button **does not render at all** -- silent absence. No tooltip, no disabled state, no console warning.
- **D-03:** The `useLocalTranscribe` hook exposes an `isSupported` flag. ChatInput reads it to conditionally render the LocalTranscribeButton. Check runs once on mount.
- **D-04:** Retry mechanism is **click mic again** -- same as normal flow. Error toast appears, button returns to idle (Phase 3 D-13), user clicks mic to retry download. No retry button in toast, no auto-retry.
- **D-05:** **Network-aware error messages** -- differentiate between offline/unreachable, timeout, and other failures. Worker needs to detect failure type and send specific error codes. New i18n keys for each failure type.
- **D-06:** Download cancellation (Phase 3 D-03 cancel button) shows a **toast.info** confirming "Download cancelled."
- **D-07:** When Whisper returns empty or whitespace-only text: show **toast.info** with helpful message, **do not insert** text into chat input, return to idle.
- **D-08:** Message includes tips: "No speech could be recognized. Try speaking louder or closer to the microphone." (de/en translations needed)

### Claude's Discretion
- Specific browser capability detection implementation (feature detection vs. user-agent sniffing -- feature detection preferred)
- Error code schema between Worker and main thread
- Network failure detection approach in the Worker (navigator.onLine, fetch error types, timeout thresholds)
- Exact i18n key naming for new error messages within `texts.chat.localTranscribe.*` namespace
- Whether to trim whitespace before empty check or check for exact empty string

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ERR-01 | Mikrofon-Berechtigung verweigert -> aussagekraftige Toast-Meldung | Already implemented in `useLocalTranscribe.ts:108-109`. No code changes needed. Verify via existing test (Test 11 in spec). |
| ERR-02 | Browser nicht kompatibel (kein Worker/WASM) -> Toast und Button nicht angezeigt | Capability detection via feature detection APIs (`typeof Worker`, `typeof WebAssembly`, `navigator.mediaDevices?.getUserMedia`, `self.crossOriginIsolated`). Hook exposes `isSupported` flag, ChatInput gates rendering. |
| ERR-03 | Modell-Download fehlgeschlagen -> Toast mit Retry-Hinweis | Worker detects failure type via `navigator.onLine` check + error type discrimination. Sends typed `code` field in error message. Hook maps code to i18n key. |
| ERR-04 | Transkription liefert leeren Text -> Toast-Meldung | Hook checks `text.trim() === ''` in result handler. Shows `toast.info()` with tips, does not call `onTranscriptReceived`. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Browser capability detection (ERR-02) | Browser / Client | -- | Pure client-side feature detection; no server involvement |
| Network failure classification (ERR-03) | Browser / Client (Worker) | -- | Worker detects network state and classifies fetch errors |
| Toast notification display (all ERRs) | Browser / Client | -- | react-toastify runs entirely client-side |
| Empty transcription check (ERR-04) | Browser / Client | -- | Hook logic in main thread checks Worker result |
| i18n translation strings | Browser / Client | -- | Static translation files loaded at build time |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-toastify | 11.0.5 | Toast notifications for all error/info messages | Already used across the codebase (30+ call sites). Default `role="alert"` provides accessibility. [VERIFIED: npm ls in project] |
| @huggingface/transformers | 4.2.0 | Whisper model pipeline in Worker (errors originate here) | Already installed; download failures from this library's fetch calls need to be caught and classified [VERIFIED: npm ls in project] |
| vitest | 4.1.4 | Unit testing for hook and worker changes | Project standard; existing test files use this framework [VERIFIED: npm ls in project] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/react | (installed) | Hook testing via `renderHook` | Used in existing `useLocalTranscribe.ui-unit.spec.ts` [VERIFIED: codebase] |

No new dependencies are needed for this phase.

## Architecture Patterns

### System Architecture Diagram

```
User clicks mic
       |
       v
[ChatInput.tsx] --isSupported?--> No --> button not rendered (ERR-02)
       |                                  (silent absence)
       | Yes
       v
[LocalTranscribeButton] --> onClick --> [useLocalTranscribe hook]
                                              |
                                              v
                                    model loaded? --No--> post {type:'load'} to Worker
                                              |                    |
                                              |                    v
                                              |          [whisper.worker.ts]
                                              |          pipeline() call to HuggingFace Hub
                                              |                    |
                                              |           fetch fails?
                                              |          /    |      \
                                              |    offline  timeout  other
                                              |         \    |      /
                                              |    {status:'error', code:'download_*'}
                                              |                    |
                                              v                    v
                                    [hook error handler]
                                    maps code -> i18n key
                                    toast.error(localized msg)
                                    setState('idle')
                                              |
                                              v
                                    model loaded, recording done
                                    Worker returns {status:'result', text:'...'}
                                              |
                                              v
                                    text.trim() empty?
                                    /              \
                                  Yes              No
                                  |                |
                           toast.info()    onTranscriptReceived(text)
                           (ERR-04)        setState('idle')
                           setState('idle')
```

### Recommended Project Structure

No new files needed. All changes are modifications to existing files:

```
frontend/src/
  hooks/
    useLocalTranscribe.ts          # Add isSupported, error code mapping, empty check
  workers/
    whisper.worker.ts              # Add network error detection + typed error codes
  pages/chat/conversation/
    ChatInput.tsx                   # Add isSupported conditional rendering
  texts/languages/
    en.ts                          # Add 4 new i18n keys
    de.ts                          # Add 4 new i18n keys (German translations)
```

### Pattern 1: Browser Capability Detection (ERR-02)

**What:** Synchronous feature detection on hook mount to determine if the browser supports all required APIs.
**When to use:** Before any Worker or media API usage.

```typescript
// Source: MDN Web Docs — feature detection pattern
// [VERIFIED: MDN docs on Worker, WebAssembly, getUserMedia, crossOriginIsolated]
const checkBrowserSupport = (): boolean => {
  return (
    typeof Worker !== 'undefined' &&
    typeof WebAssembly !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    self.crossOriginIsolated === true
  );
};
```

Implementation notes:
- `typeof Worker !== 'undefined'` checks for Web Worker support [VERIFIED: MDN Web Workers API]
- `typeof WebAssembly !== 'undefined'` checks for WASM support (needed by onnxruntime-web) [VERIFIED: MDN WebAssembly API]
- `navigator.mediaDevices?.getUserMedia` checks for media capture API (optional chaining handles missing mediaDevices) [VERIFIED: existing pattern in useTranscribe.ts:122]
- `self.crossOriginIsolated === true` checks COOP/COEP headers are active (needed for SharedArrayBuffer, which onnxruntime-web threading requires) [VERIFIED: MDN crossOriginIsolated property]

The check runs once on mount. Use `useState` with lazy initializer or `useMemo` with empty deps. The result is stable -- browser capabilities do not change during a session.

### Pattern 2: Worker Error Code Communication (ERR-03)

**What:** Extend Worker-to-main-thread error messages with a typed `code` field.
**When to use:** All error messages from Worker to main thread.

Current format:
```typescript
// Current: { status: 'error', error: string }
self.postMessage({ status: 'error', error: 'Failed to load model' });
```

Extended format:
```typescript
// New: { status: 'error', error: string, code: string }
// Source: UI-SPEC Worker Error Communication Contract
type ErrorCode = 'download_offline' | 'download_timeout' | 'download_failed' | 'transcription_failed' | 'no_audio';

self.postMessage({
  status: 'error',
  error: 'No internet connection',
  code: 'download_offline'
});
```

### Pattern 3: Network Failure Detection in Worker

**What:** Classify fetch errors into offline/timeout/generic categories.
**When to use:** In the Worker's `load` handler catch block.

```typescript
// Source: MDN navigator.onLine, MDN AbortSignal, web.dev fetch error handling
// [VERIFIED: MDN confirms navigator.onLine available in Worker via WorkerNavigator]
try {
  await TranscriberPipeline.getInstance(progressCallback);
  self.postMessage({ status: 'ready' });
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Failed to load model';
  let code = 'download_failed';

  if (!navigator.onLine) {
    code = 'download_offline';
  } else if (
    error instanceof DOMException && error.name === 'TimeoutError' ||
    (error instanceof Error && error.message.toLowerCase().includes('timeout'))
  ) {
    code = 'download_timeout';
  }

  self.postMessage({ status: 'error', error: message, code });
}
```

Key considerations:
- `navigator.onLine` is available in Web Workers via `WorkerNavigator` [VERIFIED: MDN WorkerNavigator.onLine]
- `navigator.onLine === false` reliably means offline; `true` does NOT guarantee connectivity [VERIFIED: MDN Navigator.onLine]
- Transformers.js uses `fetch()` internally for model downloads. Network failures surface as `TypeError: Failed to fetch` [VERIFIED: transformers.js GitHub issues #591]
- There is no built-in timeout in the Transformers.js pipeline call. A timeout detection approach would check for `AbortError` or `TimeoutError` in the error, or implement a timeout wrapper. However, since Transformers.js manages its own fetch calls internally and does not expose an AbortController, the practical approach is to check `error.message` for timeout-related strings [ASSUMED]
- The simplest reliable detection: check `navigator.onLine` first (offline), then check error type/message for timeout patterns, then fall back to generic

### Pattern 4: Hook Error Code Mapping (ERR-03)

**What:** Map Worker error codes to specific i18n keys for localized toast messages.
**When to use:** In the hook's `handleWorkerMessage` for `status: 'error'`.

```typescript
// Source: UI-SPEC Hook mapping logic
case 'error': {
  const code = data.code as string | undefined;
  let message: string;

  switch (code) {
    case 'download_offline':
      message = texts.chat.localTranscribe.downloadFailedOffline;
      break;
    case 'download_timeout':
      message = texts.chat.localTranscribe.downloadFailedTimeout;
      break;
    case 'download_failed':
      message = texts.chat.localTranscribe.downloadFailed;
      break;
    default:
      message = (data.error as string) || texts.chat.localTranscribe.downloadFailed;
  }

  toast.error(message);
  setState('idle'); // D-04: return to idle, user retries by clicking mic
  break;
}
```

Note: The current code sets state to `'error'` on Worker errors. Per D-04 and Phase 3 D-13, download failures should return to `'idle'` so the user can retry by clicking the mic. However, non-download errors (e.g., transcription_failed) should also go to `'idle'` per the same principle. The `'error'` state still exists in the type union but errors always auto-recover to idle via toast-only feedback.

### Pattern 5: Empty Transcription Check (ERR-04)

**What:** Check if Worker result text is empty/whitespace-only and show info toast instead of inserting.
**When to use:** In the hook's `handleWorkerMessage` for `status: 'result'`.

```typescript
// Source: CONTEXT.md D-07, D-08
case 'result': {
  const text = (data.text as string) ?? '';
  if (text.trim() === '') {
    toast.info(texts.chat.localTranscribe.emptyTranscription);
  } else {
    onTranscriptReceivedRef.current(text);
  }
  setState('idle');
  break;
}
```

### Anti-Patterns to Avoid
- **User-agent sniffing for capability detection:** Unreliable and breaks on new browser versions. Use feature detection (`typeof Worker !== 'undefined'`) instead. [CITED: MDN feature detection best practices]
- **Auto-retry on download failure:** D-04 explicitly forbids auto-retry. The retry mechanism is the user clicking the mic button again.
- **Retry button in toast:** D-04 explicitly forbids a retry button inside the toast.
- **Using `'error'` state as a dead-end:** Per Phase 3 D-13, error state returns to idle. Toast is the only error indicator.
- **Checking `text === ''` without trim:** Whisper can return whitespace-only strings. Always use `text.trim() === ''` (D-07 specifies "empty or whitespace-only").

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom notification component | `react-toastify` `toast.error()` / `toast.info()` | Already used in 30+ places. Built-in accessibility (`role="alert"`). Consistent UX. |
| Browser capability detection | Complex UA parsing library | Simple `typeof` checks and property access | Four checks that are each one line. A library would be massive overkill. |
| Network status detection | Polling-based connectivity checker | `navigator.onLine` property | Available in Worker scope. Simple boolean check. Good enough for "definitely offline" detection. |

**Key insight:** This phase requires zero new libraries. All error handling uses existing `react-toastify` patterns already established in the codebase.

## Common Pitfalls

### Pitfall 1: Worker Initialization Before Capability Check
**What goes wrong:** The hook creates a Worker on mount (line 190). If `isSupported` is `false`, the Worker should NOT be created -- it would fail or be wasteful on unsupported browsers.
**Why it happens:** The capability check and Worker creation are in separate effects.
**How to avoid:** Guard Worker creation with the `isSupported` check. If `isSupported` is `false`, skip the entire `useEffect` that creates the Worker.
**Warning signs:** Console errors about Worker creation on unsupported browsers.

### Pitfall 2: Error State vs Idle State After Download Failure
**What goes wrong:** Current code sets `setState('error')` on Worker errors (line 183). But D-04 says button should return to idle for retry. If state remains `'error'`, the `toggleRecording` handler does allow re-entry from `'error'` (line 272), but the UI-SPEC says transition should go to `'idle'`.
**Why it happens:** The original error handler was written before the Phase 4 decisions about retry UX.
**How to avoid:** Change error handler to set state to `'idle'` directly (consistent with D-04, Phase 3 D-13). The toast provides the error feedback.
**Warning signs:** Button shows unexpected visual state after an error.

### Pitfall 3: Stale Singleton After Download Failure
**What goes wrong:** `TranscriberPipeline.instance` is set as a Promise. If the pipeline creation fails, the singleton still holds the rejected promise. Subsequent `getInstance()` calls return the cached rejected promise instead of retrying.
**Why it happens:** The singleton pattern uses `??=` which only assigns if `null`. A rejected promise is truthy.
**How to avoid:** In the Worker's `load` catch block, reset `TranscriberPipeline.instance = null` before posting the error. This allows retry attempts to create a fresh pipeline.
**Warning signs:** After a download failure, clicking mic again immediately fails without attempting a new download.

### Pitfall 4: Missing navigator.onLine in Worker Test Environment
**What goes wrong:** `navigator.onLine` may not be available in the jsdom/vitest test environment. Tests that rely on it will fail or give unexpected results.
**Why it happens:** jsdom simulates DOM but may not fully implement `WorkerNavigator`.
**How to avoid:** In Worker tests, stub `navigator.onLine` via `vi.stubGlobal('navigator', { onLine: true/false })` (already done for other navigator properties in existing tests).
**Warning signs:** Tests pass locally but fail in CI, or network detection logic is never exercised.

### Pitfall 5: Existing Test Failures (4 tests)
**What goes wrong:** 4 existing tests in `useLocalTranscribe.ui-unit.spec.ts` fail because they assume the hook starts in `'loading'` state and sends `{ type: 'load' }` on mount. The actual hook starts in `'idle'` and loads lazily.
**Why it happens:** Tests were written against an earlier version of the hook that pre-loaded on mount (Phase 2 D-06). The implementation was later changed to lazy loading.
**How to avoid:** Fix these tests as part of Phase 4 work. Tests affected: Test 1 (initial state), Test 2 (load on mount), Test 5 (download progress), Test 13 (loading blocks recording).
**Warning signs:** Test suite shows 4 failures before any Phase 4 changes are made.

### Pitfall 6: Race Condition in cancelDownload Toast
**What goes wrong:** `cancelDownload` terminates the Worker and creates a new one. If toast.info is called after Worker termination but before state reset, there could be a flash of incorrect state.
**Why it happens:** Multiple state updates in sequence.
**How to avoid:** Add `toast.info()` call at the end of `cancelDownload`, after all state resets are complete.
**Warning signs:** Toast appears but button flickers between states.

## Code Examples

### Example 1: Capability Check in Hook

```typescript
// Source: CONTEXT.md D-01, D-03; MDN feature detection
// Add to useLocalTranscribe.ts
const [isSupported] = useState<boolean>(() => {
  return (
    typeof Worker !== 'undefined' &&
    typeof WebAssembly !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    self.crossOriginIsolated === true
  );
});
```

### Example 2: Conditional Rendering in ChatInput

```typescript
// Source: CONTEXT.md D-02, D-03; UI-SPEC ERR-02 section
// Modify ChatInput.tsx line ~323
showLocalTranscribe && localTranscribeHook.isSupported ? (
  <LocalTranscribeButton ... />
) : null
```

### Example 3: New i18n Keys (English)

```typescript
// Source: UI-SPEC Copywriting Contract
// Add to en.ts under localTranscribe:
downloadFailedOffline: 'No internet connection. Please check your network and try again.',
downloadFailedTimeout: 'Download timed out. Please check your connection and try again.',
downloadCancelled: 'Download cancelled.',
emptyTranscription: 'No speech could be recognized. Try speaking louder or closer to the microphone.',
```

### Example 4: New i18n Keys (German)

```typescript
// Source: UI-SPEC Copywriting Contract
// Add to de.ts under localTranscribe:
downloadFailedOffline: 'Keine Internetverbindung. Bitte überprüfen Sie Ihre Netzwerkverbindung und versuchen Sie es erneut.',
downloadFailedTimeout: 'Download-Zeitlimit überschritten. Bitte überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.',
downloadCancelled: 'Download abgebrochen.',
emptyTranscription: 'Es konnte keine Sprache erkannt werden. Versuchen Sie, lauter oder näher am Mikrofon zu sprechen.',
```

### Example 5: Worker Network Error Detection

```typescript
// Source: MDN WorkerNavigator.onLine, web.dev fetch error handling
// Modify whisper.worker.ts load handler
if (type === 'load') {
  try {
    await TranscriberPipeline.getInstance((info: ProgressInfo) => {
      self.postMessage(info);
    });
    self.postMessage({ status: 'ready' });
  } catch (error: unknown) {
    // Reset singleton so retry can create fresh pipeline
    TranscriberPipeline.instance = null;

    const message = error instanceof Error ? error.message : 'Failed to load model';
    let code = 'download_failed';

    if (!navigator.onLine) {
      code = 'download_offline';
    } else if (
      error instanceof Error &&
      error.message.toLowerCase().includes('timeout')
    ) {
      code = 'download_timeout';
    }

    self.postMessage({ status: 'error', error: message, code });
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| UA sniffing for capability detection | Feature detection via `typeof` checks | Long-established best practice | More reliable, future-proof |
| Custom notification UI | react-toastify with built-in accessibility | Already adopted in project | Consistent UX, `role="alert"` for screen readers |
| Generic error strings from Worker | Typed error codes + i18n mapping | This phase introduces it | Localized, actionable error messages |

**Deprecated/outdated:**
- None relevant to this phase. All APIs used (Worker, WebAssembly, getUserMedia, crossOriginIsolated, navigator.onLine) are stable web standards.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Transformers.js does not expose AbortController for internal fetch calls, so timeout detection relies on error.message inspection | Pattern 3: Network Failure Detection | If Transformers.js does expose abort, we could implement proper timeout via AbortSignal.timeout(). Current approach (message inspection) still works as fallback. LOW risk. |
| A2 | Setting `TranscriberPipeline.instance = null` after failure allows retry | Pitfall 3 | If the singleton has other side effects on re-creation, retry could behave unexpectedly. Can be verified by testing. LOW risk. |

## Open Questions

1. **Timeout threshold for download**
   - What we know: Transformers.js manages its own fetch calls. There is no built-in timeout. `AbortSignal.timeout()` could wrap the pipeline call but won't cancel internal fetches.
   - What's unclear: Whether to implement a timeout wrapper around `pipeline()` or rely solely on detecting timeout-like errors from the underlying fetch failures.
   - Recommendation: Do NOT implement a timeout wrapper. Rely on natural fetch timeout behavior from the browser/network stack. The Worker error handler inspects `error.message` for timeout indicators. This avoids complexity and potential race conditions with Transformers.js internals. If no timeout error occurs naturally, the download_failed generic path handles it.

2. **Singleton reset on failure (Pitfall 3)**
   - What we know: The singleton uses `this.instance ??= pipeline(...)`. If the promise rejects, subsequent calls return the rejected promise.
   - What's unclear: Whether Transformers.js internally caches partial downloads that could be reused on retry.
   - Recommendation: Reset `TranscriberPipeline.instance = null` in the catch block. Transformers.js uses browser Cache API / IndexedDB for partial model caching, so re-calling `pipeline()` will resume from cached files where possible.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.4 |
| Config file | `frontend/vite.config.ts` (test section) |
| Quick run command | `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts` |
| Full suite command | `cd frontend && npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ERR-01 | Mic permission denied shows toast | unit | `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts -t "Worker error"` | Partially (Test 11 covers generic error, not mic-specific -- mic denial tested implicitly via existing code) |
| ERR-02 | Button not rendered when isSupported=false | unit | `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts -t "isSupported"` | No -- Wave 0 gap |
| ERR-02 | Worker not created when isSupported=false | unit | same file | No -- Wave 0 gap |
| ERR-03 | Download offline error shows specific toast | unit | `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts -t "download_offline"` | No -- Wave 0 gap |
| ERR-03 | Download timeout error shows specific toast | unit | same file | No -- Wave 0 gap |
| ERR-03 | Download generic error shows specific toast | unit | same file | No -- Wave 0 gap |
| ERR-03 | Worker sends typed error code on network failure | unit | `cd frontend && npx vitest run src/workers/whisper.worker.ui-unit.spec.ts -t "network"` | No -- Wave 0 gap |
| ERR-04 | Empty transcription shows info toast, no text insertion | unit | `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts -t "empty"` | No -- Wave 0 gap |
| D-06 | Cancel download shows info toast | unit | `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts -t "cancel"` | No -- Wave 0 gap |

### Sampling Rate
- **Per task commit:** `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts src/workers/whisper.worker.ui-unit.spec.ts`
- **Per wave merge:** `cd frontend && npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] Fix 4 broken tests in `useLocalTranscribe.ui-unit.spec.ts` (Tests 1, 2, 5, 13 assume mount pre-load)
- [ ] Add `isSupported` tests to `useLocalTranscribe.ui-unit.spec.ts` -- covers ERR-02
- [ ] Add error code mapping tests to `useLocalTranscribe.ui-unit.spec.ts` -- covers ERR-03
- [ ] Add empty transcription test to `useLocalTranscribe.ui-unit.spec.ts` -- covers ERR-04
- [ ] Add cancel toast test to `useLocalTranscribe.ui-unit.spec.ts` -- covers D-06
- [ ] Add network error detection tests to `whisper.worker.ui-unit.spec.ts` -- covers ERR-03 Worker side

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | -- |
| V3 Session Management | No | -- |
| V4 Access Control | No | -- |
| V5 Input Validation | Yes (minimal) | Trim whitespace from Worker result text before empty check. No user-supplied strings flow to unsafe sinks. |
| V6 Cryptography | No | -- |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Worker message injection | Tampering | Worker only accepts messages with known `type` values ('load', 'transcribe'). No `eval()` or dynamic code execution. Already mitigated by existing Worker design. |
| Error message information leakage | Information Disclosure | Error codes are enum strings, not raw error messages. Raw error.message used as fallback only. No sensitive data in error paths. |

## Sources

### Primary (HIGH confidence)
- Project codebase: `useLocalTranscribe.ts`, `whisper.worker.ts`, `ChatInput.tsx`, `en.ts`, `de.ts` -- read directly
- Project codebase: existing test files `useLocalTranscribe.ui-unit.spec.ts`, `whisper.worker.ui-unit.spec.ts` -- read and executed
- [MDN: WorkerNavigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/WorkerNavigator/onLine) -- `navigator.onLine` available in Worker
- [MDN: Window.crossOriginIsolated](https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated) -- feature detection for COOP/COEP
- [MDN: SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer) -- crossOriginIsolated requirement
- [react-toastify accessibility docs](https://fkhadra.github.io/react-toastify/accessibility/) -- default `role="alert"` behavior
- [web.dev: Fetch API error handling](https://web.dev/articles/fetch-api-error-handling) -- error differentiation patterns
- [MDN: AbortSignal.timeout()](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static) -- TimeoutError vs AbortError

### Secondary (MEDIUM confidence)
- [Transformers.js GitHub issue #591](https://github.com/huggingface/transformers.js/issues/591) -- TypeError: fetch failed behavior
- [web.dev: COOP/COEP](https://web.dev/articles/coop-coep) -- cross-origin isolation setup

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all libraries verified in project
- Architecture: HIGH -- all patterns derived from existing codebase patterns and locked decisions
- Pitfalls: HIGH -- 5 of 6 pitfalls verified by reading code and running tests; 1 (singleton reset) verified by code inspection
- Error detection approach: MEDIUM -- `navigator.onLine` verified, but timeout detection via error.message inspection is an assumption (A1)

**Research date:** 2026-05-08
**Valid until:** 2026-06-08 (stable web APIs, no fast-moving dependencies)
