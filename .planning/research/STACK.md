# Technology Stack: Local Browser-Based Speech Recognition with Transformers.js

**Project:** c4 GenAI Suite -- Local Whisper Speech Recognition
**Researched:** 2026-05-07
**Overall Confidence:** HIGH

## Recommended Stack

### Core Library

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `@huggingface/transformers` | `^4.2.0` | ML inference runtime (Whisper ASR in browser) | Latest stable. v4 released March 2025, actively maintained (4.0 -> 4.2 through May 2026). New ModelRegistry API for cache management and progress tracking is directly needed for the download UX requirement. Monorepo restructure makes the package lighter (~53% smaller web bundle vs v3). WebGPU runtime rewritten in C++ for better performance. | HIGH |

### ONNX Model

| Model | Repository | Purpose | Why | Confidence |
|-------|------------|---------|-----|------------|
| Whisper Base (ONNX) | `onnx-community/whisper-base` | Pre-converted ONNX model for browser inference | Official onnx-community conversion of openai/whisper-base. ~140MB total (encoder + decoder). 36K+ monthly downloads. Used by 23+ HF Spaces. No manual ONNX conversion needed. Per-module dtype control available (keep encoder at fp32, quantize decoder to q8 for quality/size tradeoff). | HIGH |

### Audio Capture

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| MediaRecorder API | Browser built-in | Record audio from microphone | Already used in existing `useTranscribe` hook -- proven pattern in this codebase. Records as `audio/webm` blobs. Universally supported in modern browsers. | HIGH |
| AudioContext / OfflineAudioContext | Browser built-in | Decode and resample audio to 16kHz Float32Array | Whisper requires 16kHz mono Float32Array input. AudioContext.decodeAudioData() decodes webm blobs. OfflineAudioContext handles resampling to exact 16000Hz. No external library needed. | HIGH |

### Web Worker

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Native Web Worker (ES Module) | Browser built-in | Run Whisper inference off main thread | Mandatory -- Whisper inference takes seconds and would freeze the UI. Vite natively supports `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })` syntax with full TypeScript and import support. No bundler plugin needed. | HIGH |

### Build Tooling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vite (existing) | `8.0.8` | Build tool, dev server | Already in use. Natively handles Web Worker bundling with `import.meta.url` pattern. Needs COOP/COEP header configuration for optimal WASM multi-threading (see Infrastructure section). | HIGH |

### Infrastructure / Headers

| Technology | Configuration | Purpose | Why | Confidence |
|------------|--------------|---------|-----|------------|
| COOP/COEP Headers | Vite `server.headers` config | Enable SharedArrayBuffer for multi-threaded WASM | Without these headers, ONNX Runtime Web falls back to single-threaded WASM (3-4x slower). Required headers: `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. In dev: simple Vite server config. In production: web server/CDN config. | HIGH |

## Detailed Implementation Notes

### Transformers.js v4 Pipeline API

The primary API is the `pipeline()` function. For Whisper ASR:

```typescript
// In Web Worker (worker.ts)
import { pipeline, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;

async function loadModel(onProgress: (data: unknown) => void) {
  transcriber = await pipeline(
    "automatic-speech-recognition",
    "onnx-community/whisper-base",
    {
      dtype: {
        encoder_model: "fp32",       // encoder is sensitive to quantization
        decoder_model_merged: "q8",   // decoder tolerates quantization well
      },
      device: "wasm",                // "webgpu" for GPU acceleration where available
      progress_callback: onProgress,
    },
  );
}

async function transcribe(audioData: Float32Array, language: string) {
  if (!transcriber) throw new Error("Model not loaded");
  const result = await transcriber(audioData, {
    language,
    task: "transcribe",
  });
  return result;
}
```

### ModelRegistry API (v4 feature)

Critical for the progress bar / cache management requirements:

```typescript
import { ModelRegistry } from "@huggingface/transformers";

const modelId = "onnx-community/whisper-base";

// Check if model is already cached (skip download prompt)
const cached = await ModelRegistry.is_pipeline_cached(
  "automatic-speech-recognition",
  modelId,
  { dtype: { encoder_model: "fp32", decoder_model_merged: "q8" } }
);

// Get total download size for progress UI
const files = await ModelRegistry.get_pipeline_files(
  "automatic-speech-recognition",
  modelId,
  { dtype: { encoder_model: "fp32", decoder_model_merged: "q8" } }
);
const metadata = await Promise.all(
  files.map(file => ModelRegistry.get_file_metadata(modelId, file))
);
const totalBytes = metadata.reduce((sum, m) => sum + m.size, 0);

// Enhanced progress callback with progress_total event
const pipe = await pipeline("automatic-speech-recognition", modelId, {
  progress_callback: (e) => {
    if (e.status === "progress_total") {
      // e.progress is 0-100 for end-to-end loading
      self.postMessage({ type: "progress", progress: e.progress });
    }
  }
});
```

### Web Worker Communication Pattern

Follows the established pattern from official Transformers.js React tutorial:

```typescript
// worker.ts -- singleton pattern
class WhisperPipeline {
  static instance: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

  static getInstance(progressCallback?: (data: unknown) => void) {
    this.instance ??= pipeline(
      "automatic-speech-recognition",
      "onnx-community/whisper-base",
      {
        dtype: { encoder_model: "fp32", decoder_model_merged: "q8" },
        device: "wasm",
        progress_callback: progressCallback,
      },
    );
    return this.instance;
  }
}

self.addEventListener("message", async (event) => {
  const { type, data } = event.data;

  switch (type) {
    case "load":
      await WhisperPipeline.getInstance((progress) => {
        self.postMessage({ type: "progress", ...progress });
      });
      self.postMessage({ type: "ready" });
      break;

    case "transcribe":
      const transcriber = await WhisperPipeline.getInstance();
      const result = await transcriber(data.audio, {
        language: data.language,
        task: "transcribe",
      });
      self.postMessage({ type: "result", text: result.text });
      break;
  }
});
```

```typescript
// React hook -- useLocalTranscribe.ts
const workerRef = useRef<Worker | null>(null);

useEffect(() => {
  workerRef.current = new Worker(
    new URL("../workers/whisper.worker.ts", import.meta.url),
    { type: "module" }
  );
  // message handler...
  return () => workerRef.current?.terminate();
}, []);
```

### Audio Processing Pipeline

The audio must be converted from MediaRecorder output (webm blobs) to Whisper's required format (16kHz mono Float32Array):

```typescript
async function processAudioBlob(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();

  // Decode the audio using the browser's built-in decoder
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Resample to 16kHz using OfflineAudioContext
  const offlineCtx = new OfflineAudioContext(
    1,                                                    // mono
    Math.ceil(audioBuffer.duration * 16000),              // length at 16kHz
    16000                                                 // target sample rate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  const resampled = await offlineCtx.startRendering();
  return resampled.getChannelData(0);                     // Float32Array at 16kHz
}
```

### Vite Configuration Addition

```typescript
// vite.config.ts -- add to existing config
export default defineConfig({
  // ... existing config ...
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    // ... existing proxy config ...
  },
});
```

**Production note:** These headers must also be set on the production web server / reverse proxy / CDN. Without them, ONNX Runtime falls back to single-threaded WASM but still works -- just slower.

**COEP impact:** `require-corp` may break loading of cross-origin resources (images, fonts, scripts) that don't include a `Cross-Origin-Resource-Policy` header. If this causes issues with existing functionality, use `credentialless` instead of `require-corp` (supported in Chrome 96+, Firefox 119+).

## Model Selection Rationale

| Model | Size (ONNX) | Quality | Inference Speed (browser) | Recommendation |
|-------|-------------|---------|--------------------------|----------------|
| whisper-tiny | ~75 MB | Acceptable for English, weak for German | ~2-5s for 30s audio | Too low quality for German |
| **whisper-base** | **~140 MB** | **Good for de/en** | **~5-15s for 30s audio** | **Selected: best quality/size balance** |
| whisper-small | ~460 MB | Very good | ~20-40s for 30s audio | Too large for browser download |
| whisper-medium | ~1.5 GB | Excellent | Impractical in browser | Out of scope |

**Decision:** `whisper-base` because it offers usable German accuracy at an acceptable download size (~140MB one-time). `whisper-tiny` has noticeably worse accuracy for non-English languages. `whisper-small` and larger are too heavy for a browser-download UX.

### Per-Module Quantization

Whisper's encoder is extremely sensitive to quantization -- using q4 or q8 for the encoder significantly degrades transcription quality. The decoder is more tolerant:

| Configuration | Encoder | Decoder | Total Size (approx) | Quality Impact |
|---------------|---------|---------|---------------------|----------------|
| Full precision | fp32 | fp32 | ~140 MB | Baseline |
| **Recommended** | **fp32** | **q8** | **~105 MB** | **Negligible** |
| Aggressive | fp32 | q4 | ~85 MB | Minor degradation |
| Bad idea | q8 | q8 | ~75 MB | Significant degradation |

**Decision:** Use `fp32` for encoder, `q8` for decoder. Reduces download by ~25% with negligible quality loss.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| ML Runtime | `@huggingface/transformers` v4 | `onnxruntime-web` directly | Transformers.js wraps ONNX Runtime Web and adds the pipeline API, tokenizer, processor, progress callbacks, and model hub integration. Using ONNX Runtime directly means reimplementing all of that. |
| ML Runtime | `@huggingface/transformers` v4 | `@xenova/transformers` (v2) | `@xenova/transformers` is the old package name (pre-v3). Unmaintained. All development moved to `@huggingface/transformers`. |
| ML Runtime | `@huggingface/transformers` v4 | `whisper.cpp` / `whisper-wasm` | Lower-level C/C++ WASM port. Faster raw inference but no pipeline API, no progress callbacks, no model caching, no TypeScript types. Much more integration work. |
| Model Format | ONNX via onnx-community | TensorFlow.js (TFJS) | Transformers.js uses ONNX natively. No official TFJS Whisper models. ONNX is the standard for browser ML in 2025/2026. |
| Audio Processing | Web Audio API (AudioContext) | `wavefile` npm package | `wavefile` is needed for Node.js (no Web Audio API). In browser, AudioContext + OfflineAudioContext handle decoding and resampling natively with zero dependencies. |
| Worker Comms | `postMessage` (native) | Comlink / workerize | Adds dependency for syntactic sugar. The message protocol for Whisper is simple (load, transcribe, progress) -- 3 message types don't justify a library. Matches existing codebase patterns. |
| Inference Backend | WASM (default) | WebGPU | WebGPU gives better performance but has limited browser support (Chrome 113+, no Firefox stable, no Safari). WASM works everywhere. Start with WASM, add WebGPU as progressive enhancement later. |

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| `@xenova/transformers` | Old package name, unmaintained since v3 migration to `@huggingface/transformers`. |
| `@huggingface/transformers` v3.x | v4 is stable and current (4.2.0). v4 has ModelRegistry API needed for cache/progress UX. No reason to use v3. |
| `react-speech-recognition` for this feature | That library wraps the Web Speech API (browser-native, cloud-based). The whole point of this feature is local inference. |
| `wavefile` | Only needed in Node.js. Browser has Web Audio API built in for audio decoding and resampling. |
| `comlink` or `workerize` | Over-engineering for 3 message types. Native postMessage is clearer and matches existing codebase patterns (no worker libraries currently used). |
| `@built-in-ai/transformers-js` | Third-party wrapper for Vercel AI SDK integration. Not needed for direct pipeline usage. |
| WebGPU as default backend | Too limited in browser support for a general-purpose app. Use WASM as default, WebGPU as optional enhancement with feature detection. |

## Installation

```bash
# Single new dependency
cd frontend && npm install @huggingface/transformers@^4.2.0
```

No other new dependencies required. Audio processing uses browser built-ins (MediaRecorder, AudioContext, OfflineAudioContext). Web Worker uses native browser API with Vite's built-in bundling support.

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge | Notes |
|---------|--------|---------|--------|------|-------|
| Web Worker (ES modules) | 80+ | 114+ | 15+ | 80+ | Firefox required `dom.workers.modules.enabled` in about:config until Firefox 114 |
| MediaRecorder | 47+ | 25+ | 14.1+ | 79+ | Already validated by existing transcribe-azure feature |
| AudioContext | 35+ | 25+ | 14.1+ | 12+ | Universal modern browser support |
| OfflineAudioContext | 25+ | 25+ | 14.1+ | 12+ | Universal modern browser support |
| WASM | 57+ | 52+ | 11+ | 16+ | Required for ONNX Runtime Web |
| SharedArrayBuffer | 68+ | 79+ | 15.2+ | 79+ | Requires COOP/COEP headers. Without it, falls back to single-threaded (slower but functional) |
| WebGPU (optional) | 113+ | Nightly | No | 113+ | Future enhancement, not required |
| Cache API | 40+ | 41+ | 11.1+ | 17+ | Used by Transformers.js for model caching |

**Minimum viable:** Chrome 80+ / Firefox 114+ / Safari 15.2+ / Edge 80+. This aligns with the existing app's browser requirements (React 19, Vite 8).

## Caching Strategy

Transformers.js uses the browser's Cache API by default to store downloaded model files. Key behaviors:

1. **First load:** Downloads ~105-140MB from Hugging Face Hub. Progress callback fires per-file and total.
2. **Subsequent loads:** Loads from Cache API. Near-instant model initialization.
3. **Cache API persistence:** Survives page reloads and browser restarts. Cleared only by user action (clear site data) or browser storage pressure.
4. **v4 ModelRegistry:** `is_pipeline_cached()` allows checking cache state before showing download UI.
5. **Cache clearing:** `clear_pipeline_cache()` allows users to free storage if needed.

No IndexedDB wrapper or custom caching code needed -- Transformers.js handles this internally.

## Sources

- [@huggingface/transformers npm (v4.2.0 latest)](https://www.npmjs.com/package/@huggingface/transformers) -- verified via `npm view`
- [Transformers.js v4 announcement (Feb 2026)](https://huggingface.co/blog/transformersjs-v4) -- ModelRegistry API, WebGPU runtime, monorepo restructure
- [Transformers.js v4.0.0 release notes](https://github.com/huggingface/transformers.js/releases/tag/4.0.0) -- breaking changes, new features
- [Transformers.js official docs: React tutorial](https://huggingface.co/docs/transformers.js/tutorials/react) -- Web Worker pattern, singleton, message protocol
- [Transformers.js official docs: dtypes/quantization](https://huggingface.co/docs/transformers.js/guides/dtypes) -- per-module dtype, encoder sensitivity
- [Transformers.js official docs: WebGPU guide](https://github.com/huggingface/transformers.js/blob/main/packages/transformers/docs/source/guides/webgpu.md) -- ASR pipeline with WebGPU
- [Transformers.js official docs: Node audio processing](https://github.com/huggingface/transformers.js/blob/main/packages/transformers/docs/source/guides/node-audio-processing.md) -- audio format requirements (16kHz, Float32Array)
- [onnx-community/whisper-base on HF Hub](https://huggingface.co/onnx-community/whisper-base) -- ONNX model, 36K downloads/month
- [whisper-web reference implementation](https://github.com/xenova/whisper-web) -- Web Worker architecture for browser Whisper
- [Speech recognition blog post (Jan 2025)](https://blog.rasc.ch/2025/01/transformers-js-speech.html) -- Worker setup, audio capture, MediaRecorder pattern
- [Vite COOP/COEP configuration](https://gist.github.com/mizchi/afcc5cf233c9e6943720fde4b4579a2b) -- server.headers config for SharedArrayBuffer
- [Context7: Transformers.js documentation](https://context7.com/huggingface/transformers.js) -- pipeline API, ASR usage, worker patterns
