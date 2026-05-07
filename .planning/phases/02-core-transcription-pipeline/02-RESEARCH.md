# Phase 2: Core Transcription Pipeline - Research

**Researched:** 2026-05-07
**Domain:** Browser-based Whisper inference via Transformers.js, Web Workers, Audio Processing
**Confidence:** HIGH

## Summary

This phase delivers the end-to-end local transcription pipeline: audio capture via MediaRecorder, resampling to 16kHz mono Float32Array, Web Worker running Whisper inference via Transformers.js, and model download/caching. The deliverable is a `useLocalTranscribe` React hook that Phase 3 consumes -- no UI is built in this phase.

The technical stack is well-understood. Transformers.js v4.2.0 is already installed and provides the `pipeline("automatic-speech-recognition", ...)` API that accepts Float32Array input, supports language selection (via full language names like `'german'` and `'english'`), and handles model caching via Cache API/IndexedDB. Vite is already configured with `worker: { format: 'es' }` and `optimizeDeps: { exclude: ['@huggingface/transformers'] }`. COOP/COEP headers are in place from Phase 1.

**Critical finding:** The user decision D-02 specifies fp16 for both encoder and decoder. Research reveals that fp16 on the decoder is known to be broken in Transformers.js -- it produces errors or garbled output on both WebGPU and WASM backends. The recommended working configuration is `encoder_model: 'fp32'` with `decoder_model_merged: 'q4'` for WebGPU, or uniform `fp16` only if the decoder issue has been fixed in v4.2.0 (unverified). This must be tested during implementation and the fallback to a working dtype combination documented.

**Primary recommendation:** Follow the established Transformers.js Web Worker singleton pattern, perform audio resampling on the main thread via OfflineAudioContext (not available in Workers), transfer the Float32Array to the Worker as a Transferable, and implement robust WebGPU detection with WASM fallback.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use `onnx-community/whisper-base` from HuggingFace as the model repository.
- **D-02:** Quantization level is `fp16` for both encoder and decoder. No mixed quantization. Total download ~145MB.
- **D-03:** No version pinning -- use latest revision from the model repo. Model format is stable.
- **D-04:** First-time download starts when user clicks record for the first time (not on hook mount). User sees progress bar during download, then recording begins automatically.
- **D-05:** Before recording starts, the model must be fully loaded. No parallel recording during download -- if download fails, no audio is wasted.
- **D-06:** On subsequent uses (model cached in IndexedDB): pre-load model from cache on hook mount. This makes recording instant on click after the first use.
- **D-07:** Hook exposes extended state machine: `idle | downloading | loading | recording | transcribing | error`. Phase 3 can render distinct UI per state.
- **D-08:** Download progress exposed as object: `{ loaded: number, total: number, percentage: number }`. Transformers.js already reports loaded/total bytes -- pass through directly.
- **D-09:** Language passed as parameter to hook: `useLocalTranscribe({ language: 'de', ... })`. Hook doesn't read extension config directly -- Phase 3 manages language state.
- **D-10:** Callback pattern matches existing hook: `onTranscriptReceived: (transcript: string) => void`.
- **D-11:** Auto-stop at 2 minutes shows a toast notification, consistent with existing `useTranscribe` hook pattern.

### Claude's Discretion
- Worker communication protocol (message types, error shapes)
- Web Worker lifecycle (singleton vs per-use)
- Audio resampling implementation details (OfflineAudioContext approach)
- WebGPU detection and WASM fallback strategy
- Internal Worker error handling and retry behavior

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WORK-01 | Whisper inference in dedicated Web Worker (no main thread blocking) | Transformers.js singleton Worker pattern verified via Context7 and official docs. Vite `worker: { format: 'es' }` already configured. |
| WORK-02 | Pipeline as singleton in Worker (no re-init per transcription) | Singleton pattern is the canonical Transformers.js approach -- `static instance` with null-coalescing assignment. Verified via Context7 React tutorial. |
| WORK-03 | WebGPU auto-detection with WASM fallback | `navigator.gpu` available in DedicatedWorker. Detection pattern: check `navigator.gpu`, `requestAdapter()`, fallback to WASM if null. Transformers.js defaults to WASM when no device specified. |
| WORK-04 | Worker reports download progress (loaded/total bytes) | `progress_callback` fires `ProgressStatusInfo` with `{ status: 'progress', loaded, total, progress }` per file. `TotalProgressInfo` with `status: 'progress_total'` provides aggregate. Types verified from installed package. |
| WORK-05 | Language parameter support (de/en) | ASR pipeline accepts `{ language: 'german', task: 'transcribe' }`. Note: Whisper uses full English language names, not ISO codes. Map `'de'` -> `'german'`, `'en'` -> `'english'`. |
| AUDIO-01 | Audio capture via MediaRecorder | Existing `useTranscribe` hook provides complete reference pattern: `audio/webm` MIME type, 100ms timeslice, blob chunking. |
| AUDIO-02 | Resample to 16kHz mono Float32Array via OfflineAudioContext | OfflineAudioContext NOT available in Web Workers -- resampling MUST happen on main thread before transfer. Create OfflineAudioContext(1, duration*16000, 16000), decode blob, render. |
| AUDIO-03 | Float32Array transfer to Worker as Transferable (zero-copy) | `worker.postMessage({ audio: float32Array }, [float32Array.buffer])` -- standard Transferable pattern. |
| AUDIO-04 | 2-minute max recording with auto-stop | Copy timer pattern from `useTranscribe`: `setInterval` checking elapsed time, toast on auto-stop. |
| MODEL-01 | On-demand model download from HuggingFace Hub | `pipeline()` downloads on first call. Trigger on first record click (D-04). |
| MODEL-02 | Model cached in browser after download | Transformers.js uses Cache API by default in browsers. Cached files served from browser cache on subsequent `pipeline()` calls. Pre-load from cache on hook mount (D-06). |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Audio capture (MediaRecorder) | Browser / Client | -- | Browser API, must run on main thread for microphone access |
| Audio resampling (16kHz mono) | Browser / Client | -- | OfflineAudioContext is main-thread-only Web API |
| Whisper inference | Web Worker | -- | Computationally intensive, must be off main thread |
| Model download & caching | Web Worker | Browser / Client (Cache API) | Transformers.js handles caching internally; pipeline init triggers download |
| WebGPU/WASM detection | Web Worker | -- | `navigator.gpu` available in DedicatedWorker; detection runs where inference runs |
| State management (hook) | Browser / Client | -- | React hook manages state machine, coordinates main thread and worker |
| Progress reporting | Web Worker -> Browser / Client | -- | Worker sends progress via postMessage, hook updates state |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @huggingface/transformers | 4.2.0 | Whisper inference, model loading, caching | Already installed. Only library for browser-side ONNX Whisper inference. [VERIFIED: npm ls] |
| React (hooks) | 19.2.5 | useLocalTranscribe hook | Project standard. [VERIFIED: package.json] |
| Vite (worker bundling) | 8.0.8 | Web Worker ES module bundling | Already configured with `worker: { format: 'es' }`. [VERIFIED: vite.config.ts] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-toastify | 11.0.3 | Toast notifications for auto-stop, errors | Already used by useTranscribe for same purpose. [VERIFIED: package.json] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OfflineAudioContext | Manual downsampling algorithm | OfflineAudioContext is browser-native, well-tested; manual is error-prone but works in Workers |
| Transformers.js Cache API | Manual IndexedDB storage | Transformers.js handles caching automatically; custom storage adds complexity with no benefit |

**Installation:**
No additional packages needed -- all dependencies already installed in Phase 1.

## Architecture Patterns

### System Architecture Diagram

```
Main Thread (React)                          Web Worker
================================            ================================

useLocalTranscribe hook                      whisper.worker.ts
  |                                           |
  |--[mount]-- check model cached? --------->|
  |            postMessage({type:'load'})     |-- pipeline() with
  |                                           |   progress_callback
  |<-- {status:'ready'} --------------------|   (from cache = fast)
  |                                           |
  |--[click record]                           |
  |  |-- model loaded? ----YES--->[record]    |
  |  |-- model not loaded?                    |
  |     |-- postMessage({type:'load'}) ----->|
  |     |<-- {status:'progress', ...} ------|-- progress_callback fires
  |     |<-- {status:'progress_total',...} --|   per file & aggregate
  |     |<-- {status:'ready'} --------------|
  |     |-- [auto-start recording]            |
  |                                           |
  |--[stop recording]                         |
  |  |-- MediaRecorder.stop()                 |
  |  |-- collect audio Blob                   |
  |  |-- decode via AudioContext              |
  |  |-- resample via OfflineAudioContext      |
  |     (44100Hz -> 16kHz mono Float32Array)  |
  |  |-- postMessage(                         |
  |     {type:'transcribe',                   |
  |      audio: float32Array,                 |
  |      language: 'german'},                 |
  |     [float32Array.buffer]  <--Transferable|
  |     )                                     |
  |                                           |--transcriber(audio, {
  |                                           |   language, task:'transcribe'
  |                                           | })
  |<-- {status:'result', text:'...'} --------|
  |  |-- onTranscriptReceived(text)           |
  |  |-- setState('idle')                     |
```

### Recommended Project Structure
```
frontend/src/
├── hooks/
│   ├── useTranscribe.ts           # existing cloud transcription
│   └── useLocalTranscribe.ts      # NEW: local transcription hook
├── workers/
│   └── whisper.worker.ts          # NEW: Web Worker for Whisper inference
└── lib/
    └── audio-utils.ts             # NEW: OfflineAudioContext resampling utility
```

### Pattern 1: Web Worker Singleton Pipeline
**What:** Singleton pattern ensures the Transformers.js pipeline is created once and reused across transcriptions.
**When to use:** Always -- pipeline initialization is expensive (model loading, ONNX session creation).
**Example:**
```typescript
// Source: Context7 - /huggingface/transformers.js React tutorial
import { pipeline, env, ProgressCallback } from '@huggingface/transformers';

env.allowLocalModels = false;

class TranscriptionPipeline {
  static task = 'automatic-speech-recognition' as const;
  static model = 'onnx-community/whisper-base';
  static instance: ReturnType<typeof pipeline> | null = null;

  static async getInstance(progress_callback?: ProgressCallback) {
    this.instance ??= pipeline(this.task, this.model, {
      dtype: 'fp16', // or per-module: { encoder_model: 'fp16', decoder_model_merged: 'fp16' }
      device: await detectDevice(),
      progress_callback,
    });
    return this.instance;
  }
}

async function detectDevice(): Promise<'webgpu' | 'wasm'> {
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    const adapter = await navigator.gpu.requestAdapter();
    if (adapter) return 'webgpu';
  }
  return 'wasm';
}
```

### Pattern 2: Worker Communication Protocol
**What:** Typed message protocol between main thread and Worker.
**When to use:** All Worker communication.
**Example:**
```typescript
// Message types (shared types file)
type WorkerRequest =
  | { type: 'load' }
  | { type: 'transcribe'; audio: Float32Array; language: string };

type WorkerResponse =
  | { status: 'initiate'; name: string; file: string }
  | { status: 'progress'; name: string; file: string; progress: number; loaded: number; total: number }
  | { status: 'progress_total'; name: string; progress: number; loaded: number; total: number }
  | { status: 'done'; name: string; file: string }
  | { status: 'ready' }
  | { status: 'result'; text: string }
  | { status: 'error'; error: string };
```

### Pattern 3: Audio Resampling via OfflineAudioContext
**What:** Convert MediaRecorder output (typically 44.1/48kHz stereo webm) to 16kHz mono Float32Array required by Whisper.
**When to use:** After recording stops, before sending to Worker.
**Example:**
```typescript
// Source: MDN OfflineAudioContext docs + Web Audio API spec
async function resampleAudio(audioBlob: Blob, targetSampleRate = 16000): Promise<Float32Array> {
  const audioContext = new AudioContext();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Calculate target length for the desired sample rate
  const numSamples = Math.ceil(audioBuffer.duration * targetSampleRate);

  // OfflineAudioContext: 1 channel (mono), numSamples frames, target sample rate
  const offlineCtx = new OfflineAudioContext(1, numSamples, targetSampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  // .slice() creates an owned copy of the Float32Array
  return renderedBuffer.getChannelData(0).slice();
}
```

### Pattern 4: Transferable Zero-Copy Transfer
**What:** Transfer Float32Array to Worker without copying via Transferable objects.
**When to use:** When sending audio data to Worker.
**Example:**
```typescript
// Main thread sends audio to worker
const audioData = await resampleAudio(audioBlob);
worker.postMessage(
  { type: 'transcribe', audio: audioData, language: 'german' },
  [audioData.buffer] // Transfer ownership -- audioData becomes unusable on main thread
);
```

### Pattern 5: Hook State Machine
**What:** Extended state machine matching D-07 contract.
**When to use:** useLocalTranscribe hook.
**Example:**
```typescript
// Extended state type (D-07)
type LocalTranscribeState = 'idle' | 'downloading' | 'loading' | 'recording' | 'transcribing' | 'error';

// Download progress type (D-08)
interface DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
}
```

### Anti-Patterns to Avoid
- **Resampling in the Worker:** OfflineAudioContext is NOT available in Web Workers. Always resample on the main thread. [VERIFIED: MDN docs + WebAudio spec]
- **Recording during model download:** D-05 explicitly forbids this. If download fails, no audio is wasted.
- **Creating pipeline per transcription:** Always use singleton pattern. Pipeline creation loads the full model -- this takes seconds even from cache.
- **Using ISO language codes with Whisper:** Whisper expects full English names (`'german'`, `'english'`), NOT ISO codes (`'de'`, `'en'`). The hook receives `'de'`/`'en'` from the consumer and must map to the correct format before sending to the Worker.
- **Blocking main thread with model operations:** All Transformers.js operations (pipeline creation, inference) must run in the Worker, never on the main thread.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ONNX model loading & caching | Custom IndexedDB/fetch logic | Transformers.js `pipeline()` | Handles CDN fetching, Cache API storage, progress reporting, ONNX session creation |
| Audio format conversion | Manual WAV parsing / PCM conversion | OfflineAudioContext | Browser-native, handles sample rate conversion and channel mixing correctly |
| WebGPU shader compilation | Custom ONNX Runtime setup | Transformers.js device option | Library manages ONNX Runtime backend selection and session creation |
| Progress aggregation across files | Custom file-tracking logic | `progress_total` event from DefaultProgressCallback | Transformers.js v4.2 provides aggregate progress_total events automatically |

**Key insight:** Transformers.js is a high-level abstraction over ONNX Runtime Web. Using it via `pipeline()` handles model file management, tokenizer loading, processor initialization, and backend selection. Going lower-level (e.g., `WhisperForConditionalGeneration.from_pretrained()`) is only needed for advanced control not required here.

## Common Pitfalls

### Pitfall 1: fp16 Decoder Issues
**What goes wrong:** Using `dtype: 'fp16'` (uniform) or `dtype: { encoder_model: 'fp16', decoder_model_merged: 'fp16' }` produces garbled output or throws errors on both WebGPU and WASM backends. [CITED: github.com/huggingface/transformers.js/issues/894, github.com/huggingface/transformers.js/issues/1317]
**Why it happens:** Whisper's decoder is sensitive to quantization. The ONNX fp16 decoder model files have known numerical precision issues.
**How to avoid:** Test fp16 decoder with the specific `onnx-community/whisper-base` model and Transformers.js 4.2.0 during implementation. If broken, fall back to `{ encoder_model: 'fp16', decoder_model_merged: 'q4' }` (known working) or `'fp32'` (safe default). User decision D-02 specifies fp16 for both, but this may not work -- see Assumptions Log A1.
**Warning signs:** Transcription returns nonsensical text, repeated tokens, or empty strings despite clear audio input.

### Pitfall 2: OfflineAudioContext in Web Worker
**What goes wrong:** Attempting to create OfflineAudioContext in a Web Worker throws `ReferenceError: OfflineAudioContext is not defined`. [VERIFIED: MDN docs]
**Why it happens:** Web Audio API (including OfflineAudioContext) is only available on the main thread (Window scope), not in Worker scope.
**How to avoid:** Perform all audio resampling on the main thread before transferring Float32Array to the Worker.
**Warning signs:** Runtime errors in worker code mentioning undefined constructors.

### Pitfall 3: Language Code Format Mismatch
**What goes wrong:** Passing `language: 'de'` to the Whisper pipeline instead of `language: 'german'` results in incorrect language detection or fallback to English.
**Why it happens:** Whisper uses full English language names, not ISO 639-1 codes. [CITED: github.com/xenova/transformers.js/issues/725, ASR pipeline type definitions]
**How to avoid:** Create a language mapping: `{ de: 'german', en: 'english' }` in the hook or worker.
**Warning signs:** German audio transcribed as English or with significantly degraded quality.

### Pitfall 4: Float32Array Becomes Unusable After Transfer
**What goes wrong:** Accessing the Float32Array on the main thread after `postMessage` with Transferable causes errors because ownership was transferred.
**Why it happens:** Transferable objects move ownership to the receiving context -- the sending context's reference becomes detached (zero-length).
**How to avoid:** Don't reference the Float32Array after posting it. If you need the data on both sides, `.slice()` before transferring.
**Warning signs:** `TypeError: Cannot perform Construct on a detached ArrayBuffer`.

### Pitfall 5: Multiple Pipeline Instances
**What goes wrong:** If the Worker receives multiple 'load' messages before the first completes, multiple pipeline instances could be created, consuming excessive memory (~300MB+ for duplicated Whisper base).
**Why it happens:** Race condition when hook mounts and user clicks record simultaneously.
**How to avoid:** Use null-coalescing assignment pattern (`this.instance ??= pipeline(...)`) which returns the existing promise if already in flight.
**Warning signs:** Browser tab memory usage spikes, potential OOM crashes.

### Pitfall 6: Model Download Blocks UI
**What goes wrong:** If pipeline() is called on the main thread, the ONNX model loading and session creation blocks the UI for 5-30 seconds.
**Why it happens:** ONNX Runtime initialization involves CPU-intensive operations (WASM compilation, weight parsing).
**How to avoid:** All pipeline operations MUST be in the Web Worker. The hook only communicates via postMessage.
**Warning signs:** Page becomes unresponsive during first use.

### Pitfall 7: AudioContext Creation Without User Gesture
**What goes wrong:** Creating AudioContext for decoding audio may be blocked by autoplay policies if not triggered by a user gesture.
**Why it happens:** Browsers require user interaction before creating AudioContext to prevent autoplay abuse.
**How to avoid:** The AudioContext for resampling is created inside the stop-recording handler, which is triggered by user interaction (click). This satisfies the user gesture requirement. However, the resume() method may still need to be called.
**Warning signs:** AudioContext state is "suspended", decodeAudioData hangs silently.

## Code Examples

### Complete Worker Implementation
```typescript
// Source: Context7 Transformers.js React tutorial + ASR pipeline types
// frontend/src/workers/whisper.worker.ts

import { pipeline, env, ProgressInfo } from '@huggingface/transformers';
import type { AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';

env.allowLocalModels = false;

const LANGUAGE_MAP: Record<string, string> = {
  de: 'german',
  en: 'english',
};

class TranscriberPipeline {
  static instance: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

  static async getInstance(progress_callback?: (info: ProgressInfo) => void) {
    this.instance ??= pipeline(
      'automatic-speech-recognition',
      'onnx-community/whisper-base',
      {
        dtype: 'fp16',
        device: await detectDevice(),
        progress_callback,
      },
    ) as Promise<AutomaticSpeechRecognitionPipeline>;
    return this.instance;
  }
}

async function detectDevice(): Promise<'webgpu' | 'wasm'> {
  try {
    if ('gpu' in navigator) {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) return 'webgpu';
    }
  } catch {
    // WebGPU not available
  }
  return 'wasm';
}

self.addEventListener('message', async (event: MessageEvent) => {
  const { type } = event.data;

  if (type === 'load') {
    try {
      await TranscriberPipeline.getInstance((info) => {
        self.postMessage(info);
      });
      self.postMessage({ status: 'ready' });
    } catch (error) {
      self.postMessage({
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to load model',
      });
    }
  }

  if (type === 'transcribe') {
    try {
      const { audio, language } = event.data as {
        audio: Float32Array;
        language: string;
      };
      const transcriber = await TranscriberPipeline.getInstance();
      const whisperLanguage = LANGUAGE_MAP[language] ?? 'english';

      const result = await transcriber(audio, {
        language: whisperLanguage,
        task: 'transcribe',
      });

      const text = Array.isArray(result) ? result[0].text : result.text;
      self.postMessage({ status: 'result', text: text.trim() });
    } catch (error) {
      self.postMessage({
        status: 'error',
        error: error instanceof Error ? error.message : 'Transcription failed',
      });
    }
  }
});
```

### Hook Message Handler (progress_total usage)
```typescript
// Source: Transformers.js v4.2.0 installed types (utils/core.d.ts)
// How to handle progress_total for aggregate download progress (D-08)

worker.current.addEventListener('message', (e: MessageEvent) => {
  const data = e.data;

  switch (data.status) {
    case 'progress_total':
      // Aggregate progress across all model files
      setDownloadProgress({
        loaded: data.loaded,
        total: data.total,
        percentage: data.progress, // 0-100
      });
      break;

    case 'ready':
      setRecordingState('idle'); // or 'loading' -> 'idle'
      setModelLoaded(true);
      break;

    case 'result':
      onTranscriptReceived(data.text);
      setRecordingState('idle');
      break;

    case 'error':
      toast.error(data.error);
      setRecordingState('error');
      break;
  }
});
```

### Audio Resampling Utility
```typescript
// Source: MDN OfflineAudioContext docs
// frontend/src/lib/audio-utils.ts

export async function resampleToMono16kHz(audioBlob: Blob): Promise<Float32Array> {
  const audioContext = new AudioContext();

  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const targetSampleRate = 16000;
    const numSamples = Math.ceil(audioBuffer.duration * targetSampleRate);

    const offlineCtx = new OfflineAudioContext(1, numSamples, targetSampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    return renderedBuffer.getChannelData(0).slice();
  } finally {
    await audioContext.close();
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `quantized: true/false` boolean | `dtype: 'q4' \| 'fp16' \| ...` parameter | Transformers.js v3 | Per-module dtype control for encoder-decoder models |
| Xenova/* model repos | onnx-community/* model repos | Transformers.js v3 | onnx-community is the maintained repo for ONNX models |
| No aggregate progress | `progress_total` event via DefaultProgressCallback | Transformers.js v4 | Aggregate download progress without manual file tracking |
| WebGPU not supported | `device: 'webgpu'` option | Transformers.js v3 | GPU acceleration in browser (though WASM often faster for Whisper on Apple Silicon) |

**Deprecated/outdated:**
- `Xenova/*` model repos: Still functional but `onnx-community/*` is maintained. Use onnx-community per D-01. [VERIFIED: Context7 docs]
- `quantized` boolean option: Replaced by `dtype` parameter in v3. [VERIFIED: Context7 dtypes guide]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | D-02 specifies fp16 for both encoder and decoder, but research shows fp16 decoder has known issues (garbled output, errors). The claim that it works correctly in Transformers.js 4.2.0 with onnx-community/whisper-base is UNVERIFIED. | Common Pitfalls, Standard Stack | HIGH -- if fp16 decoder is broken, transcription produces unusable output. Must test early and fall back to `{ encoder_model: 'fp16', decoder_model_merged: 'q4' }` or `'fp32'`. |
| A2 | WASM is faster than WebGPU for Whisper on Apple Silicon (based on issue #894 benchmarks on M2). This may not hold for all hardware. | Architecture Patterns | LOW -- WebGPU is a nice-to-have optimization; WASM is the reliable fallback. |
| A3 | `progress_total` aggregate event is available in Transformers.js 4.2.0 (types verified, runtime behavior assumed from type definitions). | Code Examples | LOW -- if not available, per-file progress events can be manually aggregated. |
| A4 | Whisper language parameter accepts `'german'` and `'english'` as full names. Confirmed via GitHub issue #725 and official examples for French. German specifically not verified with a running instance. | Common Pitfalls | MEDIUM -- if wrong, transcription still works but may use wrong language or auto-detect. |

## Open Questions

1. **fp16 Decoder Viability**
   - What we know: fp16 decoder is reported broken in issues #894 and #1317 (tested with Transformers.js v3.x). The dtype types support per-module specification.
   - What's unclear: Whether Transformers.js v4.2.0 has fixed the fp16 decoder issue for onnx-community/whisper-base specifically.
   - Recommendation: Test fp16 for both encoder and decoder as D-02 specifies. If output is garbled, immediately switch to `{ encoder_model: 'fp16', decoder_model_merged: 'q4' }`. Document the actual working configuration.

2. **WebGPU Performance vs WASM for Whisper**
   - What we know: Issue #894 shows WASM ~2x faster than WebGPU on M2 Mac for Whisper (fp32+q4 config).
   - What's unclear: Whether WebGPU is faster on discrete GPUs (e.g., NVIDIA in Windows).
   - Recommendation: Implement WebGPU detection and auto-selection as D-03 area of discretion. Users with WebGPU hardware get it automatically; no explicit configuration needed.

3. **Model Cache Detection on Mount**
   - What we know: D-06 says "pre-load model from cache on hook mount." Transformers.js caches to Cache API.
   - What's unclear: How to detect if model is already cached without triggering a download. The pipeline() call with `progress_callback` should fire `initiate` -> `done` quickly for cached files (no `download`/`progress` events).
   - Recommendation: On mount, call `pipeline()` in the Worker. If model is cached, it loads from Cache API quickly (< 1s). The `progress_callback` will show `initiate` then `done` without `download` events, making it distinguishable from a fresh download. Set state to `loading` during this phase.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `frontend/vite.config.ts` (test section) |
| Quick run command | `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts` |
| Full suite command | `cd frontend && npm run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WORK-01 | Whisper runs in Web Worker, not main thread | unit (mock Worker) | `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts -t "worker"` | Wave 0 |
| WORK-02 | Pipeline is singleton (one instance) | unit (Worker mock) | `cd frontend && npx vitest run src/workers/whisper.worker.ui-unit.spec.ts -t "singleton"` | Wave 0 |
| WORK-03 | WebGPU detection with WASM fallback | unit | `cd frontend && npx vitest run src/workers/whisper.worker.ui-unit.spec.ts -t "device"` | Wave 0 |
| WORK-04 | Progress reporting (loaded/total) | unit (mock messages) | `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts -t "progress"` | Wave 0 |
| WORK-05 | Language parameter (de/en) mapping | unit | `cd frontend && npx vitest run src/workers/whisper.worker.ui-unit.spec.ts -t "language"` | Wave 0 |
| AUDIO-01 | MediaRecorder capture | unit (mock MediaRecorder) | `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts -t "record"` | Wave 0 |
| AUDIO-02 | Resample to 16kHz mono | unit (mock OfflineAudioContext) | `cd frontend && npx vitest run src/lib/audio-utils.ui-unit.spec.ts` | Wave 0 |
| AUDIO-03 | Transferable zero-copy | unit (verify postMessage args) | `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts -t "transfer"` | Wave 0 |
| AUDIO-04 | 2-min auto-stop | unit (fake timers) | `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts -t "auto-stop"` | Wave 0 |
| MODEL-01 | On-demand download trigger | unit (mock Worker) | `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts -t "download"` | Wave 0 |
| MODEL-02 | Cache pre-loading on mount | unit (mock Worker) | `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts -t "cache"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts`
- **Per wave merge:** `cd frontend && npm run test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `frontend/src/hooks/useLocalTranscribe.ui-unit.spec.ts` -- covers WORK-01, WORK-04, WORK-05, AUDIO-01, AUDIO-03, AUDIO-04, MODEL-01, MODEL-02
- [ ] `frontend/src/workers/whisper.worker.ui-unit.spec.ts` -- covers WORK-02, WORK-03, WORK-05
- [ ] `frontend/src/lib/audio-utils.ui-unit.spec.ts` -- covers AUDIO-02
- Note: Web Worker and OfflineAudioContext must be mocked in vitest/jsdom. Real integration tests require browser environment (Playwright).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | -- |
| V3 Session Management | no | -- |
| V4 Access Control | no | -- |
| V5 Input Validation | yes | Validate audio blob size before processing (prevent memory exhaustion). Validate Worker message shape. |
| V6 Cryptography | no | -- |

### Known Threat Patterns for Browser ML Pipeline

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious model injection (model poisoning) | Tampering | Use pinned model from `onnx-community/whisper-base` -- Transformers.js validates model hashes via Cache API |
| Memory exhaustion via large audio | Denial of Service | 2-minute max recording enforced by timer; OfflineAudioContext output bounded by duration * 16000 samples |
| Worker message spoofing | Tampering | Worker is same-origin; postMessage cannot be spoofed from external scripts |

## Project Constraints (from CLAUDE.md)

- **Testing convention:** Frontend unit tests use Vitest with `*.ui-unit.spec.*` or `*.integration.spec.*` naming pattern
- **Commit convention:** `<type>(<scope>): <subject>` -- scope is `frontend` for this phase
- **Lint before commit:** `cd frontend && npm run lint`
- **Format before commit:** `cd frontend && npm run format`
- **TypeScript strict mode:** Enabled in tsconfig.json -- all types must be explicit
- **Worker format:** ES modules (`worker: { format: 'es' }` in vite.config.ts)
- **No manual editing of generated files:** `frontend/src/api/generated/` is auto-generated
- **Test environment:** jsdom (vitest.setup.ts) -- Web Worker and AudioContext APIs must be mocked

## Sources

### Primary (HIGH confidence)
- Context7 `/huggingface/transformers.js` -- Pipeline API, Worker pattern, progress_callback, dtype configuration, ASR pipeline types
- Installed package types `@huggingface/transformers@4.2.0` -- ProgressInfo union type, AudioInput type (Float32Array accepted), ASR options (language, task), dtype per-module Record support
- `frontend/vite.config.ts` -- Worker format, optimizeDeps, COOP/COEP headers confirmed
- `frontend/src/hooks/useTranscribe.ts` -- Existing hook pattern, MediaRecorder usage, cleanup, state machine
- MDN OfflineAudioContext docs -- Resampling API, main-thread-only limitation
- MDN WorkerNavigator.gpu -- WebGPU available in DedicatedWorker

### Secondary (MEDIUM confidence)
- [GitHub Issue #894](https://github.com/huggingface/transformers.js/issues/894) -- WASM faster than WebGPU for Whisper on M2, fp16 decoder issues
- [GitHub Issue #1317](https://github.com/huggingface/transformers.js/issues/1317) -- q8 decoder broken on WebGPU
- [GitHub Issue #725](https://github.com/xenova/transformers.js/issues/725) -- Language parameter format (full English names)
- [HuggingFace Blog - Transformers.js v3](https://huggingface.co/blog/transformersjs-v3) -- WebGPU support, dtype migration

### Tertiary (LOW confidence)
- WebGPU performance claims for non-Apple hardware -- no benchmarks found for Windows/NVIDIA
- fp16 decoder status in Transformers.js v4.2.0 specifically (issues were from v3.x)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, APIs verified from installed types
- Architecture: HIGH -- Worker singleton pattern is canonical Transformers.js approach, audio resampling via OfflineAudioContext is well-documented
- Pitfalls: HIGH -- fp16 decoder issue verified from multiple GitHub issues; OfflineAudioContext Worker limitation confirmed via MDN; language format confirmed via issue discussion
- dtype compatibility: MEDIUM -- fp16 decoder issue confirmed for v3.x, unverified for v4.2.0

**Research date:** 2026-05-07
**Valid until:** 2026-06-07 (Transformers.js is actively developed; check for v4.3+ changes)
