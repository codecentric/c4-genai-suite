# Architecture Patterns

**Domain:** Local browser-based speech recognition (Whisper via Transformers.js)
**Researched:** 2026-05-07

## Recommended Architecture

### Overview

The architecture isolates ML inference in a dedicated Web Worker, connects it to the existing Extension system via a thin backend extension (no middleware, no server-side processing), and presents a UI consistent with the existing `TranscribeButton` pattern. Audio flows from the microphone through the Web Audio API for resampling, then into the Worker for inference. The Worker manages the complete Transformers.js pipeline lifecycle (load, cache, infer, unload).

```
┌─────────────────────────────────────────────────────────────────────┐
│  Main Thread (React)                                                │
│                                                                     │
│  ChatInput.tsx                                                      │
│    ├─ detects extension name "transcribe-local"                     │
│    ├─ renders LocalTranscribeButton (with language dropdown)        │
│    └─ uses useLocalTranscribe hook                                  │
│                                                                     │
│  useLocalTranscribe hook                                            │
│    ├─ manages MediaRecorder (capture audio)                         │
│    ├─ converts Blob → Float32Array@16kHz via AudioContext           │
│    ├─ owns Worker lifecycle (lazy init, message passing)            │
│    ├─ tracks states: idle | loading-model | recording |             │
│    │                  processing | error                            │
│    └─ exposes: toggleRecording, modelProgress, transcript           │
│                                                                     │
│  Audio Resampling (in main thread, before Worker handoff)           │
│    └─ OfflineAudioContext.decodeAudioData() → resample to 16kHz    │
│       → extract mono channel → Float32Array                        │
│                                                                     │
├─────────────── postMessage (transferable ArrayBuffer) ──────────────┤
│                                                                     │
│  Web Worker: whisper.worker.ts                                      │
│    ├─ handles messages: load | transcribe | unload                  │
│    ├─ singleton pipeline via AutomaticSpeechRecognitionPipeline     │
│    ├─ model: onnx-community/whisper-base (or whisper-base-ONNX)    │
│    ├─ Transformers.js caches to browser Cache API automatically     │
│    └─ posts back: loading-progress | ready | result | error         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Backend                                                            │
│    └─ LocalTranscribeExtension (type: "other", group: "speech-to-  │
│       text", name: "transcribe-local")                              │
│       ├─ No arguments (no API keys, no server config)               │
│       ├─ No middlewares (inference happens in browser)              │
│       └─ Purpose: make extension visible in admin UI so it can be   │
│          assigned to assistants; frontend detects name to show UI    │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `LocalTranscribeExtension` (backend) | Registers extension in system, enables admin assignment to assistants. Zero server-side logic for transcription. | Frontend via configuration DTO (extension name visible in `configuration.extensions`) |
| `ChatInput.tsx` (frontend) | Detects `transcribe-local` extension name, renders appropriate button component. Follows same pattern as existing `speech-to-text` / `transcribe-azure` detection. | `useLocalTranscribe` hook |
| `LocalTranscribeButton` (frontend) | UI component: microphone button + language dropdown + progress bar during model download. Follows `SpeechRecognitionButton` layout pattern (button + dropdown). | `useLocalTranscribe` hook (receives state, emits toggle actions) |
| `useLocalTranscribe` hook (frontend) | Orchestrates recording, audio preprocessing, Worker communication, and state management. Owns the full lifecycle. | MediaRecorder API, AudioContext API, `whisper.worker.ts` via `postMessage` |
| `whisper.worker.ts` (frontend) | Runs Transformers.js pipeline in isolated thread. Manages model singleton, performs inference, reports progress. | Transformers.js / ONNX Runtime (internal), main thread via `postMessage` |

### Data Flow

**Phase 1: Model Loading (first use or cache miss)**

```
User clicks mic button
  → useLocalTranscribe: check if Worker exists, if not create it
  → postMessage({ type: 'load', model: 'onnx-community/whisper-base', language: 'de' })
  → Worker: pipeline('automatic-speech-recognition', modelId, {
      dtype: 'q8',           // quantized for size/speed balance
      progress_callback: (e) => self.postMessage({ type: 'loading-progress', ...e })
    })
  → Worker downloads model files (~140MB), Transformers.js caches them in Cache API
  → Worker: self.postMessage({ type: 'ready' })
  → useLocalTranscribe: set state to 'idle', model is loaded
```

**Phase 2: Record-then-Transcribe (normal operation)**

```
User clicks mic button (model already loaded)
  → useLocalTranscribe: start MediaRecorder with getUserMedia({ audio: true })
  → MediaRecorder collects chunks every 100ms (same as existing useTranscribe)
  → 2-minute max timer running

User clicks mic button again (stop)
  → MediaRecorder.stop()
  → Collect all Blob chunks into single Blob (audio/webm)
  → Convert Blob to ArrayBuffer via blob.arrayBuffer()
  → AudioContext.decodeAudioData(arrayBuffer) → AudioBuffer
  → Resample to 16kHz mono:
      const offlineCtx = new OfflineAudioContext(1, duration * 16000, 16000);
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start();
      const resampled = await offlineCtx.startRendering();
      const float32 = resampled.getChannelData(0);  // mono Float32Array
  → postMessage(
      { type: 'transcribe', audio: float32.buffer, language: 'de' },
      [float32.buffer]  // transfer ownership, zero-copy
    )
  → Worker: reconstruct Float32Array from transferred buffer
  → Worker: pipeline(float32Audio, { language, task: 'transcribe' })
  → Worker: self.postMessage({ type: 'result', text: transcribedText })
  → useLocalTranscribe: call onTranscriptReceived(text) → sets input value
```

**Phase 3: Future real-time streaming (not implemented in v1)**

```
Preparation in architecture:
  - Worker message protocol includes 'transcribe-chunk' type (reserved, not handled)
  - Worker singleton pattern allows streaming chunks to same loaded model
  - useLocalTranscribe state machine has extensible states
  - AudioWorklet could replace MediaRecorder for continuous 16kHz PCM streaming
  
Future flow:
  → AudioWorklet captures 16kHz PCM directly (no post-processing needed)
  → Chunks posted to Worker every N seconds
  → Worker processes with chunk_length_s / stride_length_s for overlap
  → Worker posts partial results back incrementally
  → Hook accumulates partial transcripts in real time
```

## Component Specifications

### Backend Extension: `LocalTranscribeExtension`

```typescript
// backend/src/extensions/other/local-transcribe.ts
@Extension()
export class LocalTranscribeExtension implements Extension {
  constructor(private readonly i18n: I18nService) {}

  get spec(): ExtensionSpec {
    return {
      name: 'transcribe-local',
      group: 'speech-to-text',        // mutually exclusive with other STT extensions
      title: this.i18n.t('texts.extensions.transcribeLocal.title'),
      logo: '...microphone SVG...',
      description: this.i18n.t('texts.extensions.transcribeLocal.description'),
      type: 'other',
      arguments: {},                    // no server-side configuration needed
    };
  }

  getMiddlewares(): Promise<ChatMiddleware[]> {
    return Promise.resolve([]);         // no chat pipeline involvement
  }
}
```

**Why `group: 'speech-to-text'`:** The existing extensions use this group to enforce mutual exclusivity -- only one voice input method per assistant. The `ChatInput.tsx` filtering logic at line 179-183 picks the first matching voice extension. Adding `transcribe-local` to the same group means admin can choose exactly one of: Web Speech API, Azure Transcribe, or Local Whisper per assistant.

### Web Worker: `whisper.worker.ts`

```typescript
// frontend/src/workers/whisper.worker.ts
import { pipeline, env } from '@huggingface/transformers';
import type { AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';

// Disable local model check (browser-only, download from HF Hub)
env.allowLocalModels = false;

// Message types -- explicit union for type safety
type IncomingMessage =
  | { type: 'load'; model: string; quantized: boolean }
  | { type: 'transcribe'; audio: ArrayBuffer; language: string }
  | { type: 'unload' };

type OutgoingMessage =
  | { type: 'loading-progress'; status: string; progress?: number; file?: string }
  | { type: 'ready' }
  | { type: 'result'; text: string }
  | { type: 'error'; message: string };

let pipelineInstance: AutomaticSpeechRecognitionPipeline | null = null;
let currentModelId: string | null = null;

async function loadModel(modelId: string, quantized: boolean) {
  if (pipelineInstance && currentModelId === modelId) {
    self.postMessage({ type: 'ready' } as OutgoingMessage);
    return;
  }

  pipelineInstance = await pipeline(
    'automatic-speech-recognition',
    modelId,
    {
      dtype: quantized ? 'q8' : 'fp32',
      progress_callback: (data: any) => {
        self.postMessage({
          type: 'loading-progress',
          ...data,
        } as OutgoingMessage);
      },
    }
  );
  currentModelId = modelId;
  self.postMessage({ type: 'ready' } as OutgoingMessage);
}

async function transcribe(audioBuffer: ArrayBuffer, language: string) {
  if (!pipelineInstance) {
    self.postMessage({ type: 'error', message: 'Model not loaded' } as OutgoingMessage);
    return;
  }

  const audioData = new Float32Array(audioBuffer);
  const result = await pipelineInstance(audioData, {
    language,
    task: 'transcribe',
    chunk_length_s: 30,
    stride_length_s: 5,
  });

  const text = Array.isArray(result) ? result.map(r => r.text).join(' ') : result.text;
  self.postMessage({ type: 'result', text } as OutgoingMessage);
}

self.addEventListener('message', async (event: MessageEvent<IncomingMessage>) => {
  const { type } = event.data;
  try {
    switch (type) {
      case 'load':
        await loadModel(event.data.model, event.data.quantized);
        break;
      case 'transcribe':
        await transcribe(event.data.audio, event.data.language);
        break;
      case 'unload':
        pipelineInstance = null;
        currentModelId = null;
        break;
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    } as OutgoingMessage);
  }
});
```

### React Hook: `useLocalTranscribe`

```typescript
// frontend/src/hooks/useLocalTranscribe.ts
// State machine: idle → loading-model → idle → recording → processing → idle
//                                                                    → error → idle

export type LocalTranscribeState =
  | 'idle'
  | 'loading-model'
  | 'recording'
  | 'processing'
  | 'error';

interface UseLocalTranscribeProps {
  onTranscriptReceived: (transcript: string) => void;
  maxDurationMs?: number;
  model?: string;
  language?: string;
}

export function useLocalTranscribe({
  onTranscriptReceived,
  maxDurationMs = 2 * 60 * 1000,   // 2 minutes
  model = 'onnx-community/whisper-base',
  language = 'de',
}: UseLocalTranscribeProps) {
  // Worker ref: created once, reused across recordings
  // MediaRecorder refs: same pattern as existing useTranscribe
  // Model loading progress: { loaded: number, total: number, file: string }
  // State: LocalTranscribeState
  
  // Key behaviors:
  // 1. Worker is lazily created on first toggle
  // 2. Model loads on first toggle, stays loaded for session
  // 3. Recording uses same MediaRecorder pattern as useTranscribe
  // 4. After stop: Blob → ArrayBuffer → AudioContext resample → Worker
  // 5. Worker result → onTranscriptReceived callback

  return {
    state,                    // LocalTranscribeState
    isRecording,              // state === 'recording'
    isProcessing,             // state === 'processing'
    isModelLoading,           // state === 'loading-model'
    modelProgress,            // { loaded, total, percent } | null
    isModelReady,             // pipeline loaded and ready
    toggleRecording,          // () => void
  };
}
```

### Audio Resampling Utility

```typescript
// frontend/src/lib/audio-utils.ts

/**
 * Convert a Blob of recorded audio (webm/ogg) to a 16kHz mono Float32Array
 * suitable for Whisper inference.
 */
export async function audioToFloat32At16kHz(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Resample to 16kHz mono using OfflineAudioContext
  const targetSampleRate = 16000;
  const duration = audioBuffer.duration;
  const offlineCtx = new OfflineAudioContext(
    1,                                        // mono
    Math.ceil(duration * targetSampleRate),    // total samples
    targetSampleRate
  );
  
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);
  
  const resampled = await offlineCtx.startRendering();
  
  await audioContext.close();
  return resampled.getChannelData(0);  // Float32Array, mono, 16kHz
}
```

### Vite Configuration Changes

```typescript
// vite.config.ts additions

export default defineConfig({
  // ... existing config ...
  worker: {
    format: 'es',  // enable ES module imports in workers
  },
  // COOP/COEP headers for SharedArrayBuffer (enables WASM multi-threading)
  // Only needed in dev; production requires server-side header configuration
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'configure-response-headers',
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          next();
        });
      },
    },
  ],
});
```

**Important COOP/COEP note:** These headers enable `SharedArrayBuffer` which ONNX Runtime WASM uses for multi-threaded inference. Without them, inference falls back to single-threaded mode (slower but functional). The headers may affect other cross-origin resources (e.g., the proxy to backend at `/api-proxy`). If conflicts arise, Transformers.js still works without SharedArrayBuffer -- it just runs single-threaded. Test carefully before committing to these headers.

### ChatInput.tsx Integration

```typescript
// Extend the existing voice extension detection (lines 179-183):

const voiceExtensions =
  configuration?.extensions?.filter(
    (e) => e.name === 'speech-to-text' 
        || e.name === 'transcribe-azure'
        || e.name === 'transcribe-local'    // NEW
  ) ?? [];
const activeVoiceExtension = voiceExtensions[0];
const showSpeechToText = activeVoiceExtension?.name === 'speech-to-text';
const showTranscribe = activeVoiceExtension?.name === 'transcribe-azure';
const showLocalTranscribe = activeVoiceExtension?.name === 'transcribe-local';  // NEW

// In the JSX, add a third branch:
{showSpeechToText ? (
  <SpeechRecognitionButton ... />
) : showTranscribe ? (
  <TranscribeButton ... />
) : showLocalTranscribe ? (
  <LocalTranscribeButton ... />   // NEW
) : null}
```

## Patterns to Follow

### Pattern 1: Singleton Pipeline in Worker

**What:** Create the Transformers.js pipeline once, reuse for all transcriptions within a session. Store as module-level variable in the Worker.

**When:** Always -- model loading is the expensive operation (~140MB download + WASM compilation). Inference is comparatively fast.

**Why:** Loading whisper-base takes 5-30 seconds depending on connection and cache state. Users will transcribe multiple times per session. The singleton avoids re-initialization on every recording.

**Guard:** Check if `currentModelId` matches requested model before reloading. If model changes (future: model selection), dispose old pipeline and create new one.

### Pattern 2: Transferable ArrayBuffer for Audio

**What:** When posting audio data from main thread to Worker, use the `transfer` parameter of `postMessage` to transfer ownership of the ArrayBuffer instead of copying it.

**When:** Every transcription request.

**Why:** Audio at 16kHz mono for 2 minutes = ~3.8MB of Float32 data. Structured cloning (the default) would copy this data. Transfer moves it zero-copy. The main thread no longer needs the audio data after posting.

```typescript
const float32 = await audioToFloat32At16kHz(blob);
worker.postMessage(
  { type: 'transcribe', audio: float32.buffer, language },
  [float32.buffer]  // transfer list
);
// float32.buffer is now detached (neutered) in main thread -- this is fine
```

### Pattern 3: Follow Existing Hook Return Shape

**What:** The `useLocalTranscribe` hook should expose the same essential interface as `useTranscribe`: `isRecording`, `isTranscribing` (here: `isProcessing`), `toggleRecording`. Add model-specific extras (`isModelLoading`, `modelProgress`) as additional properties.

**When:** Designing the hook API.

**Why:** Consistency with existing codebase. The `TranscribeButton` and `LocalTranscribeButton` components should feel interchangeable to the developer. The `ChatInput.tsx` integration should read naturally alongside the existing hooks.

### Pattern 4: Lazy Worker Initialization

**What:** Do not create the Web Worker at component mount. Create it on first user interaction (first mic button click).

**When:** Always.

**Why:** Workers consume memory even when idle. Many users/assistants will not have the local transcribe extension enabled. Lazy init means zero overhead for non-users. Also avoids issues with Worker module loading during SSR or testing.

```typescript
const workerRef = useRef<Worker | null>(null);

function getOrCreateWorker() {
  if (!workerRef.current) {
    workerRef.current = new Worker(
      new URL('../workers/whisper.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current.addEventListener('message', handleWorkerMessage);
  }
  return workerRef.current;
}
```

### Pattern 5: Progress Aggregation for Model Download

**What:** Transformers.js emits per-file progress events during model loading (config.json, tokenizer.json, encoder model, decoder model, etc.). Aggregate these into a single overall progress percentage for the UI.

**When:** During model download/loading phase.

**Why:** Users need a single meaningful progress indicator, not per-file noise. Transformers.js v4 adds `progress_total` event type that simplifies this. For v3, track `{ file: progress }` map and compute weighted average.

```typescript
// In Worker, with Transformers.js v4:
progress_callback: (e) => {
  if (e.status === 'progress_total') {
    self.postMessage({ type: 'loading-progress', percent: e.progress });
  }
}

// Fallback for v3 (per-file):
const fileProgress = new Map<string, number>();
progress_callback: (e) => {
  if (e.status === 'progress') {
    fileProgress.set(e.file, e.progress);
    const total = [...fileProgress.values()].reduce((a, b) => a + b, 0) / fileProgress.size;
    self.postMessage({ type: 'loading-progress', percent: total });
  }
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Running Transformers.js on Main Thread

**What:** Importing and running the pipeline directly in the React component or hook, without a Web Worker.

**Why bad:** Whisper inference is CPU-intensive. Even whisper-base takes 2-10 seconds for a 30-second clip. Running on main thread freezes the entire UI -- no animations, no button clicks, no scroll. Users will think the app crashed.

**Instead:** Always run in a Web Worker. The Worker thread has its own event loop and cannot block the main thread.

### Anti-Pattern 2: Creating a New Worker Per Transcription

**What:** `new Worker(...)` on every mic button press, terminating after each transcription.

**Why bad:** Each Worker creation re-initializes the WASM runtime and must reload the model pipeline (even from cache, this takes seconds). Workers are designed to be long-lived.

**Instead:** Create once (lazily), reuse for the session. Terminate only on component unmount or explicit unload.

### Anti-Pattern 3: Sending Audio as Structured Clone

**What:** `worker.postMessage({ audio: float32Array })` without transfer list.

**Why bad:** Structured cloning copies the entire Float32Array. For 2 minutes of 16kHz mono audio, that is 1,920,000 floats = ~7.7MB copied. Transfer is zero-copy and instant.

**Instead:** Use `worker.postMessage(msg, [float32Array.buffer])` with transfer list.

### Anti-Pattern 4: Resampling in the Web Worker

**What:** Sending the raw MediaRecorder Blob to the Worker and doing audio decoding there.

**Why bad:** Web Workers do not have access to `AudioContext` or `OfflineAudioContext`. These are main-thread-only Web APIs. You would need to bundle a JavaScript audio decoder library (adding significant bundle size) or use a second AudioWorklet.

**Instead:** Resample in the main thread using `OfflineAudioContext`, then transfer the resulting Float32Array to the Worker. This is fast (native browser implementation) and the data is ready for Whisper immediately.

### Anti-Pattern 5: Bundling the Model in the App

**What:** Including the ~140MB Whisper model in the Vite build output.

**Why bad:** Massively inflates app bundle for all users, even those who never use local transcription. Vite build times would be terrible. Cache invalidation on every deploy.

**Instead:** The model loads on-demand from the Hugging Face Hub. Transformers.js automatically caches downloaded files in the browser's Cache API. Second load is fast (local cache hit, no network).

## File Structure

```
frontend/src/
  workers/
    whisper.worker.ts          # Web Worker with Transformers.js pipeline
  hooks/
    useLocalTranscribe.ts      # React hook orchestrating recording + worker
  lib/
    audio-utils.ts             # audioToFloat32At16kHz resampling utility
  pages/chat/conversation/
    LocalTranscribeButton.tsx  # UI component (mic + language dropdown + progress)
    ChatInput.tsx              # Modified: add transcribe-local detection

backend/src/
  extensions/other/
    local-transcribe.ts        # Extension registration (name, group, type)
  localization/
    *.json                     # Add transcribeLocal.title and .description
```

## Scalability Considerations

| Concern | Record-then-Transcribe (v1) | Future Real-time Streaming |
|---------|----------------------------|---------------------------|
| Audio capture | MediaRecorder (simple, proven) | AudioWorklet (continuous PCM at 16kHz) |
| Audio preprocessing | OfflineAudioContext resample after stop | AudioWorklet produces 16kHz PCM directly |
| Chunk strategy | Full recording sent as one chunk | Overlapping chunks (30s window, 5s stride) |
| Worker message frequency | 1 message per recording | Many messages (every 2-5 seconds) |
| Model memory | ~200MB WASM heap, acceptable | Same -- model stays loaded |
| Browser compatibility | All modern browsers | AudioWorklet: Chrome, Firefox, Safari 14.1+ |
| Latency | Acceptable (post-recording) | Critical (user expects <2s feedback) |

## Preparing for Real-time Without Over-engineering

The v1 architecture prepares for real-time streaming through these specific choices, none of which add implementation cost now:

1. **Worker message protocol is typed and extensible.** Adding `{ type: 'transcribe-chunk' }` later requires no protocol changes.

2. **Worker singleton pattern.** The loaded model stays in memory. Streaming just sends more frequent messages to the same pipeline.

3. **Audio utility is a separate module.** When switching to AudioWorklet for real-time, the `audio-utils.ts` module can be extended or a parallel path can be added without touching the Worker.

4. **State machine in hook is explicit.** Adding `'streaming'` state later is a one-line type change plus handler logic, not a refactor.

5. **What NOT to build now:** Do not create an AudioWorklet, do not implement chunked transcription with overlap, do not build partial-result accumulation UI. These are all real-time concerns that add complexity without value for record-then-transcribe.

## Build Order (Dependency Graph)

```
Phase 1: Foundation
  1a. Backend extension (local-transcribe.ts)          # no dependencies
  1b. Audio resampling utility (audio-utils.ts)        # no dependencies
  1c. Web Worker (whisper.worker.ts)                   # depends on @huggingface/transformers
  
  Can build 1a, 1b, 1c in parallel.

Phase 2: Integration
  2a. useLocalTranscribe hook                          # depends on 1b (audio-utils), 1c (worker)
  2b. Vite config (worker format, optional COOP/COEP)  # depends on nothing, but test with 1c
  
Phase 3: UI
  3a. LocalTranscribeButton component                  # depends on 2a (hook interface)
  3b. ChatInput.tsx modification                        # depends on 3a, 2a
  3c. i18n texts                                        # depends on nothing, but needed by 3a, 3b

Phase 4: Polish
  4a. Progress bar UI for model download               # depends on 2a (modelProgress from hook)
  4b. Error handling edge cases                         # depends on all above
  4c. COOP/COEP header investigation and production    # depends on deployment infrastructure
      server configuration
```

## Sources

- [whisper-web (reference implementation)](https://github.com/xenova/whisper-web) -- HIGH confidence
- [Transformers.js documentation](https://huggingface.co/docs/transformers.js/index) -- HIGH confidence
- [Transformers.js v4 blog (ModelRegistry, progress_total)](https://huggingface.co/blog/transformersjs-v4) -- HIGH confidence
- [Transformers.js v3 blog (WebGPU, ASR support)](https://huggingface.co/blog/transformersjs-v3) -- HIGH confidence
- [onnx-community/whisper-base model card](https://huggingface.co/onnx-community/whisper-base) -- HIGH confidence
- [Speech Recognition in the Browser with Transformers.js](https://blog.rasc.ch/2025/01/transformers-js-speech.html) -- MEDIUM confidence (community blog, verified patterns)
- [Offline Whisper: Browser + Node.js (AssemblyAI)](https://www.assemblyai.com/blog/offline-speech-recognition-whisper-browser-node-js) -- MEDIUM confidence
- [Vite Web Workers documentation](https://vite-workshop.netlify.app/web-workers) -- MEDIUM confidence
- [COOP/COEP for SharedArrayBuffer (web.dev)](https://web.dev/articles/coop-coep) -- HIGH confidence
- [whisper-web DeepWiki architecture analysis](https://deepwiki.com/xenova/whisper-web) -- MEDIUM confidence
