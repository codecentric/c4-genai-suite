# Project Research Summary

**Project:** Lokale Spracherkennung mit Transformers.js
**Domain:** Browser-based ML inference (speech recognition) integrated into existing enterprise chat platform
**Researched:** 2026-05-07
**Confidence:** HIGH

## Executive Summary

This project adds a third speech recognition option to the c4 GenAI Suite -- one that runs Whisper inference entirely in the browser via Transformers.js, ensuring audio data never leaves the user's device. The architecture is well-understood: a Web Worker runs the Transformers.js pipeline (whisper-base, ~140MB ONNX model), audio is captured via MediaRecorder and resampled to 16kHz mono Float32Array using OfflineAudioContext, and the result is inserted into the chat input. The backend contribution is minimal -- a single extension registration file with no middleware, no API keys, no server-side processing. The heavy lifting is entirely frontend.

The recommended approach uses `@huggingface/transformers` v4.2+ with the `onnx-community/whisper-base` model, a record-then-transcribe flow (not real-time streaming), and per-module quantization (fp32 encoder, q8 decoder) to reduce download size to ~105MB with negligible quality loss. The existing extension system, hook patterns, and UI components provide strong integration templates -- the new feature follows established patterns for `TranscribeButton` and `useTranscribe`, meaning the implementation is largely "fill in the blanks" rather than novel architecture.

The primary risks are infrastructure-level, not algorithmic. Cross-origin isolation headers (COOP/COEP) must be configured correctly for WASM multi-threading performance, but the `credentialless` COEP policy avoids breaking existing cross-origin resources. Vite's bundler must exclude `onnxruntime-web` from pre-bundling, and the Web Worker construction pattern must follow Vite's exact syntactic requirements to survive production builds. Memory management (pipeline disposal, singleton pattern, React Strict Mode guards) is the other critical concern. All of these pitfalls are well-documented with clear prevention strategies.

## Key Findings

### Recommended Stack

The stack is minimal -- one new npm dependency plus browser built-ins. Transformers.js v4 provides the complete ML inference runtime including model loading, caching, progress callbacks, and the ASR pipeline. Everything else (audio capture, resampling, Web Workers) uses native browser APIs already proven in the existing codebase.

**Core technologies:**
- `@huggingface/transformers` v4.2+: ML inference runtime -- wraps ONNX Runtime Web with pipeline API, model caching, progress tracking, and TypeScript types. The v4 ModelRegistry API directly enables the required download progress UX.
- `onnx-community/whisper-base` (ONNX model): Pre-converted Whisper model, ~140MB (or ~105MB with q8 decoder). 36K+ monthly downloads, used by 23+ HF Spaces. No manual ONNX conversion needed.
- Web Worker (native, ES module): Mandatory for running inference off main thread. Vite natively supports `new Worker(new URL(...), { type: 'module' })` with full TypeScript and import resolution.
- MediaRecorder + OfflineAudioContext (browser built-ins): Audio capture and 16kHz resampling. Same MediaRecorder pattern already used by the existing `useTranscribe` hook.

### Expected Features

**Must have (table stakes):**
- Microphone toggle button with recording state indication (pulse/red/disabled)
- Model download progress bar (~140MB first-time download)
- Language selection (de/en) via dropdown
- Record-then-transcribe flow with transcription spinner
- Transcript insertion into chat textarea
- Error handling for all failure modes (mic denied, download failed, browser unsupported, empty transcription)
- Max recording duration enforcement (2 minutes)
- Browser compatibility detection (Web Worker, WASM)
- Microphone permission handling before model download

**Should have (differentiators):**
- Privacy badge/indicator -- reinforces core value proposition at near-zero cost
- Recording timer display (elapsed/max) -- low effort, high polish
- Silence/no-speech detection -- prevents Whisper hallucinations on empty audio
- WebGPU acceleration (transparent, feature-detected) -- significant performance gain where available

**Defer (v2+):**
- Audio level visualization -- medium effort for visual polish only
- Transcription confidence feedback -- API limitations make this hard
- Real-time streaming transcription -- architecturally prepare but do not implement
- Model selection by end users -- fix whisper-base; admin-configurable later if needed

### Architecture Approach

The architecture cleanly separates concerns: a thin backend extension (registration only, no server logic), a React hook (`useLocalTranscribe`) that orchestrates recording and Worker communication, a Web Worker (`whisper.worker.ts`) that owns the Transformers.js pipeline lifecycle, and a UI component (`LocalTranscribeButton`) that mirrors the existing TranscribeButton. Audio flows from microphone through main-thread resampling (OfflineAudioContext), then to the Worker via zero-copy transfer for inference.

**Major components:**
1. `LocalTranscribeExtension` (backend) -- registers extension with name `transcribe-local`, group `speech-to-text`, type `other`. No arguments, no middlewares.
2. `whisper.worker.ts` (frontend) -- singleton pipeline, handles load/transcribe/unload messages, reports progress and results. Isolates all ML inference from main thread.
3. `useLocalTranscribe` hook (frontend) -- state machine (idle/loading-model/recording/processing/error), manages MediaRecorder, audio preprocessing, Worker lifecycle.
4. `LocalTranscribeButton` (frontend) -- UI component with mic button, language dropdown, progress bar. Follows existing SpeechRecognitionButton layout pattern.
5. `audio-utils.ts` (frontend) -- `audioToFloat32At16kHz()` utility for Blob-to-Float32Array conversion via OfflineAudioContext.

### Critical Pitfalls

1. **COOP/COEP headers missing (silent 3-4x performance collapse)** -- Without cross-origin isolation headers, ONNX Runtime silently falls back to single-threaded WASM. Use `credentialless` COEP policy (not `require-corp`). Configure in both Vite dev plugin and production server. Verify with `self.crossOriginIsolated === true`.

2. **Vite bundler misconfiguration for ONNX Runtime** -- Vite's pre-bundling cannot process `onnxruntime-web` WASM binaries. Add `optimizeDeps: { exclude: ['onnxruntime-web'] }` and `assetsInclude: ['**/*.onnx']` to vite.config.ts before any Transformers.js imports.

3. **Web Worker construction pattern must be syntactically exact** -- Vite requires `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })` as a single expression. Separating the URL into a variable breaks production builds while working fine in dev.

4. **Memory leak from undisposed pipeline** -- Pipeline objects hold ~140MB model weights. Use a persistent singleton Worker (do not terminate on component unmount). Guard against React Strict Mode double-mount. Call `pipeline.dispose()` only on explicit unload.

5. **Audio format conversion errors (silent wrong output)** -- Whisper requires 16kHz mono Float32Array. Incorrect resampling produces garbage transcriptions without errors. Use `OfflineAudioContext` for proper sinc resampling; never attempt manual interpolation.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Infrastructure and Scaffolding

**Rationale:** Three critical pitfalls (COOP/COEP headers, Vite bundler config, package/model ID) must be resolved before any feature code is written. Getting infrastructure wrong means debugging false negatives throughout all subsequent phases.
**Delivers:** Working build pipeline with Transformers.js, correct Vite configuration, COOP/COEP headers, backend extension registration, i18n text keys, basic project scaffolding.
**Addresses:** Browser compatibility detection, backend extension registration.
**Avoids:** Pitfalls 1 (COOP/COEP), 2 (Vite bundler), 7 (COEP breaking existing resources), 9 (wrong package/model ID).

### Phase 2: Core Pipeline (Worker + Audio + Hook)

**Rationale:** This is the technical core -- the Web Worker, audio processing utility, and React hook. These three components have tight dependencies (hook depends on both Worker and audio utility) and must be built and tested together. This phase has the highest pitfall density (5 pitfalls).
**Delivers:** Working end-to-end transcription pipeline: record audio, resample, send to Worker, run Whisper inference, return text. No UI yet -- testable via hook alone.
**Addresses:** Record-then-transcribe flow, model download with progress callback, transcript delivery, max duration enforcement, microphone permission handling.
**Avoids:** Pitfalls 3 (Worker pattern), 4 (memory leak), 5 (audio format), 6 (no progress feedback), 8 (structured clone vs transfer), 11 (MIME type), 12 (Strict Mode double-mount).

### Phase 3: UI Integration

**Rationale:** With the hook delivering a clean API (state, toggleRecording, modelProgress), the UI layer is straightforward and follows established component patterns. Separating UI from core pipeline allows the pipeline to stabilize before adding visual complexity.
**Delivers:** Fully integrated local transcription in the chat UI, indistinguishable in interaction pattern from existing cloud options.
**Addresses:** Microphone toggle button, recording state indication, transcription progress indicator, model download progress bar, language selection dropdown, error toasts.

### Phase 4: Polish and Hardening

**Rationale:** Differentiator features and edge-case hardening should come after the core flow is stable. These are low-effort, high-value additions that make the feature feel production-ready.
**Delivers:** Privacy indicator, recording timer, silence detection, WebGPU acceleration, mobile graceful degradation.
**Addresses:** Privacy badge, recording timer display, silence/no-speech detection, WebGPU acceleration, model cache persistence.
**Avoids:** Pitfalls 10 (WASM threading bug), 13 (cache eviction), 14 (language parameter), 15 (mobile crashes).

### Phase Ordering Rationale

- Infrastructure first because three critical pitfalls (headers, bundler, package identity) block all other work. Debugging Whisper accuracy when the real problem is wrong COEP headers wastes days.
- Core pipeline before UI because the hook API shape must stabilize before building components against it. The Worker and audio utility have the highest pitfall density and are where most debugging time will be spent.
- UI as a separate phase because it follows established patterns (TranscribeButton, SpeechRecognitionButton) and is relatively low-risk once the hook API is solid.
- Polish last because differentiators (privacy badge, timer, silence detection) add value but are not blocking for a functional feature.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** COOP/COEP header interaction with existing app resources (proxy to backend, any CDN-loaded assets). Needs hands-on testing, not just research.
- **Phase 2:** ONNX Runtime WASM threading behavior with the specific `onnxruntime-web` version bundled in Transformers.js v4.2. Verify Pitfall 10 status at implementation time.

Phases with standard patterns (skip research-phase):
- **Phase 3:** UI integration follows established codebase patterns (TranscribeButton, SpeechRecognitionButton, ChatInput.tsx detection logic). The architecture research already provides the exact integration code.
- **Phase 4:** All polish features are well-documented (WebGPU detection, AnalyserNode for silence, navigator.storage.persist).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Single new dependency (`@huggingface/transformers`). v4 is stable (released March 2025, updated through May 2026). All other technologies are browser built-ins or already in use. |
| Features | HIGH | Feature set derived from existing codebase patterns and explicit project requirements. Table stakes are clear. Anti-features are well-reasoned. |
| Architecture | HIGH | Architecture follows the reference `whisper-web` implementation pattern. Component boundaries align with existing codebase structure. Build order has clear dependency graph. |
| Pitfalls | HIGH | 15 pitfalls identified with specific prevention strategies. Critical pitfalls verified via official documentation, GitHub issues, and community reports. Two moderate pitfalls (WASM threading, model ID evolution) rated MEDIUM as they depend on specific library versions at implementation time. |

**Overall confidence:** HIGH

### Gaps to Address

- **COOP/COEP impact on existing app:** The `credentialless` COEP policy should be safe, but must be tested against the full existing app (backend proxy at `/api-proxy`, any CDN resources, embedded content). This can only be validated by running the app with headers enabled.
- **ONNX Runtime WASM threading stability:** Pitfall 10 notes a known bug in some `onnxruntime-web` versions. The specific version bundled with `@huggingface/transformers` v4.2 should be checked at implementation time. Start single-threaded for reliability.
- **Mobile browser viability:** whisper-base may crash on low-memory mobile devices. The decision to support, degrade gracefully, or disable on mobile should be made during Phase 4 based on testing, not upfront.
- **Model ID evolution:** The Hugging Face ONNX model ecosystem is actively evolving. `onnx-community/whisper-base` is current as of May 2026 but should be verified at implementation time.

## Sources

### Primary (HIGH confidence)
- [@huggingface/transformers npm v4.2.0](https://www.npmjs.com/package/@huggingface/transformers) -- API surface, version history
- [Transformers.js official documentation](https://huggingface.co/docs/transformers.js/index) -- pipeline API, Web Worker patterns, dtypes/quantization
- [Transformers.js v4 announcement](https://huggingface.co/blog/transformersjs-v4) -- ModelRegistry API, WebGPU runtime, progress_total
- [onnx-community/whisper-base on HF Hub](https://huggingface.co/onnx-community/whisper-base) -- model card, download stats
- [whisper-web reference implementation](https://github.com/xenova/whisper-web) -- Worker architecture, audio pipeline
- [MDN: Cross-Origin-Embedder-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy) -- COEP policies, credentialless
- [MDN: Transferable Objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects) -- zero-copy Worker communication
- [web.dev: COOP and COEP](https://web.dev/articles/coop-coep) -- cross-origin isolation requirements
- Existing codebase: `useTranscribe.ts`, `useSpeechRecognitionToggle.ts`, `ChatInput.tsx`, `TranscribeButton.tsx`, `SpeechRecognitionButton.tsx` -- integration patterns

### Secondary (MEDIUM confidence)
- [Speech Recognition in Browser with Transformers.js](https://blog.rasc.ch/2025/01/transformers-js-speech.html) -- Worker setup, audio capture patterns
- [Offline Whisper: Browser + Node.js (AssemblyAI)](https://www.assemblyai.com/blog/offline-speech-recognition-whisper-browser-node-js) -- browser Whisper architecture
- Transformers.js GitHub issues (#715, #740, #860, #882, #958, #988, #1016) -- pitfall verification
- Vite GitHub issues (#3909, #5979, #10837, #15962, #16536) -- bundler behavior verification

---
*Research completed: 2026-05-07*
*Ready for roadmap: yes*
