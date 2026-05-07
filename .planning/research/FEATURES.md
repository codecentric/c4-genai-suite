# Feature Landscape

**Domain:** Local browser-based speech recognition (Whisper via Transformers.js)
**Researched:** 2026-05-07
**Context:** Brownfield integration into c4 GenAI Suite, which already has two cloud-based speech recognition options (Web Speech API via `speech-to-text`, Azure Whisper via `transcribe-azure`). The new local option must feel native alongside these existing implementations.

## Table Stakes

Features users expect. Missing = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Microphone toggle button** | Users need a single, obvious control to start/stop recording. Both existing implementations use an `ActionIcon` toggle pattern -- consistency is mandatory. | Low | Follow `TranscribeButton` pattern: single button, state-driven icon/color. The `SpeechRecognitionButton` split-button with language dropdown is the more complex pattern to replicate. |
| **Recording state indication** | Users must know when the mic is hot. Without visual feedback, users don't know if they are being recorded. Both existing buttons use `animate-pulse` + red fill when active. | Low | Red pulsing icon on recording, disabled/loading spinner on transcribing, outline/black on idle. Matches existing `TranscribeButton` exactly. |
| **Transcription progress indicator** | After recording stops, local Whisper inference takes several seconds (5-30s depending on audio length and device). Silence during processing feels broken. The existing Azure path shows a loading spinner via Mantine's `loading` prop. | Low | Use Mantine `ActionIcon` `loading={isTranscribing}` like the existing `TranscribeButton`. Consider a brief toast or inline status text for longer transcriptions. |
| **Model download progress bar** | The Whisper model is ~140MB. A first-time download without progress feedback looks like the app is frozen. This is the single most important UX difference from the cloud-based options. | Medium | Transformers.js `progress_callback` provides `loaded`/`total` bytes per file. Aggregate into a single percentage. Show a Mantine `Progress` bar or modal with percentage and "Downloading speech model..." text. Cache the model in IndexedDB (Transformers.js does this automatically) so progress only appears on first use. |
| **Language selection (de/en)** | The project explicitly requires de/en support. The existing `SpeechRecognitionButton` already has a language dropdown (de-DE, en-US). Users expect the same control for the local option. Whisper multilingual models accept a language token to guide transcription. | Low | Reuse the existing `Language` type and `SpeechRecognitionButton` split-button pattern. Map `de-DE` to `<\|de\|>` and `en-US` to `<\|en\|>` for the Whisper `language` parameter. The whisper-base multilingual model supports both. |
| **Microphone permission handling** | Users must grant mic access. Denied permission must show a clear, actionable error. Existing `useTranscribe` already handles `NotAllowedError` with a dedicated toast message. | Low | Reuse existing error text: `texts.chat.transcribe.microphonePermissionDenied`. Show before any model loading occurs -- don't download 140MB only to fail on mic access. |
| **Error handling with user-facing messages** | Network failures during model download, unsupported browsers, transcription failures -- all must surface actionable messages, not silent failures. Existing hooks use `toast.error()` consistently. | Low | Use `react-toastify` toast.error() for all error states. Key error scenarios: model download failed (network), browser not supported (no Web Worker/WASM), transcription returned empty, audio too short. Follow existing i18n pattern with new text keys under `texts.chat.localTranscribe`. |
| **Max duration enforcement (2 min)** | Prevents runaway memory usage and keeps inference time manageable. The existing `useTranscribe` already implements this with `maxDurationMs` and auto-stop. | Low | Same pattern: `setInterval` checking elapsed time, auto-stop at 120,000ms, toast.info with max duration message. |
| **Transcript insertion into chat input** | The transcribed text must appear in the textarea, ready to send. Both existing implementations call `onTranscriptReceived(result.text)` or `onTranscriptUpdate(transcript)` which calls `setInput`. | Low | Follow `useTranscribe` pattern: `onTranscriptReceived: (transcript: string) => void` callback that sets the chat input value. |
| **Browser compatibility detection** | Not all browsers support the required APIs (Web Workers, WASM, potentially SharedArrayBuffer). Must fail gracefully with a clear message, not a cryptic error. | Low | Check for `window.Worker`, `WebAssembly` support at hook initialization. If missing, show `browserNotSupported` toast and don't render the button. SharedArrayBuffer may require COOP/COEP headers -- this is a deployment concern, not a runtime feature. |

## Differentiators

Features that set the local option apart from the existing cloud alternatives. Not expected but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Privacy badge/indicator** | Visually communicate that audio stays local. This is the entire reason the feature exists. A small "local" or shield icon on/near the button distinguishes it from cloud options and builds user trust. | Low | Add a subtle visual indicator (e.g., small shield icon, different icon variant, or tooltip text "Audio processed locally -- never leaves your browser"). Not a blocking feature, but reinforces the core value proposition at zero cost. |
| **Model cached/ready indicator** | After first download, show that the model is cached and ready instantly. Removes the "will this take forever?" anxiety on subsequent uses. | Low | Track `modelReady` state. On subsequent loads, Transformers.js serves from IndexedDB cache and loads in 1-3 seconds vs the initial download. Could show a brief "Model ready" status or simply skip the progress bar when cached. |
| **Recording timer display** | Show elapsed time during recording (e.g., "0:42 / 2:00"). ChatGPT and other modern voice UIs show a timer. Gives users confidence their recording is progressing and how much time remains. | Low | Use the existing `startTimeRef` pattern from `useTranscribe`. Render a small timer text near the button. Updates every second via the existing interval. |
| **Audio level visualization** | A simple waveform or volume meter during recording confirms the mic is picking up audio. Helps users diagnose "is my mic working?" issues without waiting for transcription. | Medium | Use Web Audio API `AnalyserNode` to read frequency/amplitude data from the `MediaStream`. Render as a simple bar or mini waveform. Don't overengineer -- a 3-bar volume indicator is sufficient and much simpler than a full waveform. |
| **Silence/no-speech detection** | Whisper hallucinates on silence (generates random text). Detecting empty audio before running inference saves time and prevents confusing output. | Medium | Use `AnalyserNode` to check RMS volume during recording. If average volume stays below threshold for entire recording, show "No speech detected" instead of running inference. This is a meaningful UX improvement over both existing cloud options which don't pre-check. |
| **WebGPU acceleration (when available)** | Transformers.js v3 supports WebGPU. Where available (Chrome 113+), inference is significantly faster. Transparent upgrade without user action. | Medium | Pass `device: 'webgpu'` to the pipeline when `navigator.gpu` is available, fall back to WASM otherwise. The user never selects this -- it's automatic. Worth implementing in v1 since it's a pipeline option, not a separate code path. |
| **Transcription confidence feedback** | Show the user when transcription quality might be poor (e.g., noisy audio, very short recording). Manages expectations. | High | Whisper returns log probabilities that could be aggregated into a confidence score. However, Transformers.js pipeline API does not expose these in a straightforward way. Defer unless the API makes it easy. |

## Anti-Features

Features to explicitly NOT build. These would waste effort, add complexity, or harm the product.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Real-time streaming transcription in v1** | Whisper is not designed for streaming -- it processes complete audio segments. Attempting chunked real-time transcription adds massive complexity (chunk boundary handling, partial result stitching, overlapping windows) for marginal UX gain in a chat input context where the user types a message and sends it. The existing `speech-to-text` (Web Speech API) already provides real-time transcription for users who need it. | Implement record-then-transcribe. Architect the hook so a future streaming implementation can replace the transcription step without changing the recording or UI layer. |
| **Model selection by end users** | Exposing model choices (tiny/base/small/medium/large) to end users creates confusion, support burden, and inconsistent experiences. Larger models have prohibitive download sizes for browser use (small=460MB, medium=1.5GB). | Fix whisper-base as the model. If needed later, make it admin-configurable via extension arguments, not user-selectable. |
| **Offline-first / PWA mode** | The initial model download requires internet. Making the entire app work offline is a separate, much larger concern beyond speech recognition. IndexedDB caching already handles the "second use" case. | Cache the model via Transformers.js built-in IndexedDB caching. First use requires internet; subsequent uses work without re-downloading the model. |
| **Audio playback before transcription** | Letting users replay their recording before transcribing adds UI complexity (player controls, waveform display) with minimal value in a chat context. Users want text, not audio review. | Transcribe immediately after recording stops. If the result is wrong, user can re-record. |
| **Custom vocabulary / hotword boosting** | Whisper doesn't support custom vocabularies or hotword boosting in its standard pipeline. Attempting to hack this adds fragility. | Accept Whisper's output as-is. Users can edit the transcript in the textarea before sending. |
| **Auto-send after transcription** | Automatically sending the message after transcription removes user control. Users need to review and edit before sending, especially with a model that may make errors. | Insert text into textarea. User reviews and presses Enter/send button. This matches both existing implementations. |
| **Multi-speaker diarization** | Whisper-base doesn't support speaker diarization. In a chat context with one user speaking into their mic, it's irrelevant. | Single-speaker transcription only. |
| **Audio file upload for transcription** | The feature is about voice input in chat, not batch transcription. Adding file upload creates scope creep and a different UX paradigm. | Microphone recording only. If file transcription is needed, it's a separate feature. |

## Feature Dependencies

```
Browser Compatibility Detection ─── gates everything
         │
         v
Microphone Permission Handling ──── gates recording
         │
         v
Model Download + Progress Bar ───── gates transcription (can happen in parallel with recording)
         │
         v
Recording (start/stop/timer) ────── gates transcription
         │
         v
Transcription + Progress ────────── gates result insertion
         │
         v
Transcript Insertion ────────────── end state

Language Selection ──────────────── independent, feeds into transcription as parameter
Silence Detection ───────────────── depends on Recording (uses same MediaStream)
Audio Level Visualization ───────── depends on Recording (uses same MediaStream)
WebGPU Detection ────────────────── independent, feeds into model loading as device option
Privacy Badge ───────────────────── independent, purely visual
```

**Critical path:** Browser check -> Mic permission -> Model download (can be eager/lazy) -> Record -> Transcribe -> Insert text.

**Key parallelism opportunity:** Model download can begin as soon as the extension is recognized (or on first button click), while mic permission is requested separately. The model should be downloading while the user records, not sequentially.

## MVP Recommendation

### Must build (Phase 1):

1. **Microphone toggle button** with recording state (pulse/red/disabled) -- matches existing `TranscribeButton` pattern
2. **Model download progress bar** -- the critical UX differentiator for local models
3. **Language selection (de/en)** -- explicit requirement, reuse existing split-button pattern
4. **Record-then-transcribe flow** with transcription spinner
5. **Transcript insertion** into chat textarea
6. **Error handling** for all failure modes (mic denied, download failed, browser unsupported, transcription empty)
7. **Max duration enforcement** (2 minutes)
8. **Browser compatibility detection**
9. **Model caching** (automatic via Transformers.js IndexedDB -- no custom code needed, but surface "model ready" vs "needs download" state)

### Build next (Phase 2 / quick wins after MVP):

1. **Recording timer display** -- low effort, high polish
2. **Privacy indicator** -- low effort, reinforces value proposition
3. **Silence/no-speech detection** -- prevents Whisper hallucinations, medium effort
4. **WebGPU acceleration** -- potentially significant performance gain, medium effort but mostly a config flag

### Defer:

- **Audio level visualization**: Nice but not critical. Medium effort for visual polish only.
- **Transcription confidence feedback**: API limitations make this hard. Defer until Transformers.js pipeline exposes log probabilities more easily.
- **Real-time streaming**: Architecturally prepare but do not implement. The existing Web Speech API extension already serves real-time use cases.

## Sources

- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js/index) -- HIGH confidence
- [Transformers.js GitHub](https://github.com/huggingface/transformers.js/) -- HIGH confidence
- [Whisper WebGPU Demo (Xenova)](https://huggingface.co/spaces/Xenova/whisper-webgpu) -- HIGH confidence
- [Offline Whisper in Browser (AssemblyAI)](https://www.assemblyai.com/blog/offline-speech-recognition-whisper-browser-node-js) -- MEDIUM confidence
- [Browser-Based Whisper System (Dev.to)](https://dev.to/linmingren/building-a-browser-based-speech-to-text-system-with-whisper-ai-23e5) -- MEDIUM confidence
- [Whisper Hallucination on Silence (GitHub Discussion)](https://github.com/openai/whisper/discussions/1606) -- MEDIUM confidence
- [COOP/COEP for SharedArrayBuffer (web.dev)](https://web.dev/articles/coop-coep) -- HIGH confidence
- [W3C Speech Recognition Accessibility](https://www.w3.org/WAI/perspective-videos/voice/) -- HIGH confidence
- Existing codebase: `useTranscribe.ts`, `useSpeechRecognitionToggle.ts`, `ChatInput.tsx`, `TranscribeButton.tsx`, `SpeechRecognitionButton.tsx` -- PRIMARY source for integration patterns
