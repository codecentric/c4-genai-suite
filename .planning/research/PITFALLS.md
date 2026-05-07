# Domain Pitfalls

**Domain:** Browser-based speech recognition with Transformers.js (Whisper inference)
**Researched:** 2026-05-07

## Critical Pitfalls

Mistakes that cause rewrites, broken deployments, or unusable features.

### Pitfall 1: Missing COOP/COEP Headers -- Silent Performance Collapse

**What goes wrong:** Without Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers, `SharedArrayBuffer` is unavailable. ONNX Runtime Web silently falls back to single-threaded WASM execution. Whisper inference that should take 5-10 seconds takes 20-40 seconds. There is no error, no warning -- just a 3-4x slowdown that developers may not notice until users complain.

**Why it happens:** Browsers gate `SharedArrayBuffer` behind cross-origin isolation (post-Spectre mitigation). The required headers are:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp` (or `credentialless`)

These must be set on both the dev server and the production server. The current Vite config has no custom headers. The Caddyfile (production) has no custom headers either.

**Consequences:**
- Multi-threaded WASM is disabled; inference runs on a single thread
- Performance is 2-4x slower for transformer models on multi-core hardware
- No error is thrown -- `onnxruntime-web` silently degrades
- Developers may ship thinking performance is "just how browser inference works"

**Warning signs:**
- `self.crossOriginIsolated` returns `false` in the console
- `env.backends.onnx.wasm.numThreads` effectively capped at 1 regardless of setting
- Inference times much slower than benchmarks suggest

**Prevention:**
1. **Vite dev server:** Add a plugin (not `server.headers`, which does not apply to page requests in dev mode) that sets both headers via middleware:
   ```typescript
   // vite.config.ts plugin
   {
     name: 'configure-cross-origin-isolation',
     configureServer(server) {
       server.middlewares.use((_req, res, next) => {
         res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
         res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
         next();
       });
     },
   }
   ```
2. **Caddy production:** Add headers to the Caddyfile:
   ```
   header Cross-Origin-Opener-Policy "same-origin"
   header Cross-Origin-Embedder-Policy "credentialless"
   ```
3. **Verification:** Check `self.crossOriginIsolated === true` at app startup and log a warning if false.
4. **Use `credentialless` over `require-corp`** for COEP. The `require-corp` value breaks loading of cross-origin resources (images, fonts, CDN scripts) that do not send a `Cross-Origin-Resource-Policy` header. The `credentialless` value achieves the same cross-origin isolation without breaking third-party resources. Supported in Chrome 96+, Firefox 119+, Safari 18+.

**Detection:** Add a runtime check early in the worker initialization:
```typescript
if (!self.crossOriginIsolated) {
  console.warn('Cross-origin isolation not enabled. WASM multi-threading disabled. Whisper inference will be significantly slower.');
}
```

**Phase mapping:** Must be addressed in Phase 1 (infrastructure/scaffolding) before any inference work begins. Retrofitting headers after other features depend on the current header configuration is painful.

**Confidence:** HIGH -- verified via official MDN documentation, ONNX Runtime Web behavior, and multiple Vite issue threads.

---

### Pitfall 2: Vite Bundler Misconfiguration for ONNX Runtime

**What goes wrong:** Vite tries to pre-bundle `onnxruntime-web` during dependency optimization, which either fails outright, produces corrupt bundles, or causes WASM files to be missing at runtime. Separately, Vite's default behavior does not recognize `.onnx` files as assets, causing import resolution failures.

**Why it happens:** `onnxruntime-web` contains WASM binaries and dynamic imports that Vite's esbuild-based optimizer cannot process correctly. Vite's pre-bundling rewrites import paths, which breaks the runtime's internal file resolution for `.wasm` and `.mjs` helper files.

**Consequences:**
- Build errors: "Failed to resolve onnxruntime-web"
- Runtime errors: WASM file not found (404) after deployment
- Blank page with console errors about missing `.wasm` files
- Intermittent failures that work in dev but break in production

**Warning signs:**
- Errors mentioning `onnxruntime-web` during `vite build`
- 404 errors for `.wasm` files in browser network tab
- Worker initialization fails silently

**Prevention:**
Add to `vite.config.ts`:
```typescript
export default defineConfig({
  // ... existing config
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  assetsInclude: ['**/*.onnx'],
});
```

The project already has a precedent for handling WASM files -- `copy-pdfjs-wasm.mjs` copies pdfjs WASM files to `public/`. If the ONNX runtime WASM files also need to be served as static assets, follow the same pattern with a `copy-onnx-wasm.mjs` script.

**Phase mapping:** Phase 1 (project scaffolding). Must be in place before the first `import { pipeline } from '@huggingface/transformers'` is written.

**Confidence:** HIGH -- verified via Vite GitHub discussion #15962 and official Transformers.js documentation for Next.js (analogous configuration).

---

### Pitfall 3: Web Worker Construction Pattern Must Be Syntactically Exact

**What goes wrong:** Vite uses static analysis to detect Web Worker construction. If the `new URL(...)` and `new Worker(...)` calls are separated, abstracted, or dynamically constructed, Vite does not bundle the worker file. The worker path resolves to a raw `.ts` file in dev (which works) but a missing or unbundled file in production (which breaks).

**Why it happens:** Vite's `vite:worker-import-meta-url` plugin requires the exact syntactic pattern:
```typescript
new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
```
The `new URL()` must be the direct first argument to `new Worker()`. Extracting the URL into a variable, using a ternary, or wrapping in a factory function breaks detection.

**Consequences:**
- Works perfectly in `vite dev`, breaks silently in `vite build`
- Worker file is served as-is (unbundled) or results in 404 in production
- TypeScript `.ts` worker files get served with wrong MIME type (`video/mp2t`)

**Warning signs:**
- Worker loads fine in dev, fails in production build
- Network tab shows `.ts` file being requested instead of bundled `.js`
- Console error: "Failed to construct Worker"

**Prevention:**
- Always use the one-liner pattern, never refactor URL construction:
  ```typescript
  // CORRECT
  const worker = new Worker(
    new URL('./whisper.worker.ts', import.meta.url),
    { type: 'module' }
  );
  
  // WRONG -- Vite cannot detect this
  const url = new URL('./whisper.worker.ts', import.meta.url);
  const worker = new Worker(url, { type: 'module' });
  ```
- Test the production build (`vite build && vite preview`) early, not just dev mode.

**Phase mapping:** Phase 2 (Web Worker implementation). This pattern must be understood before writing the worker integration.

**Confidence:** HIGH -- verified via multiple Vite GitHub issues (#5979, #10837, #17766, #11823).

---

### Pitfall 4: Memory Leak from Pipeline Not Being Disposed

**What goes wrong:** Transformers.js pipeline objects hold large typed arrays (the full model weights, ~140MB for whisper-base). These are not garbage-collected when a React component unmounts. The model stays in memory until the tab is closed or the worker is terminated. On repeated navigation to/from the transcription feature, memory grows unboundedly.

**Why it happens:** The pipeline singleton pattern (recommended by Transformers.js docs) keeps the model loaded. This is intentional for performance (avoids re-downloading), but becomes a problem when:
1. The worker is terminated and recreated on component unmount/remount
2. React Strict Mode double-mounts components in development
3. `pipeline.dispose()` is never called

**Consequences:**
- Memory usage grows with each navigation to/from the feature
- On mobile devices (especially Android Chrome), the tab crashes ("Aw, Snap!")
- On desktop, memory usage reaches 500MB+ after a few cycles
- Zombie WASM sessions block reloading of Whisper on Android

**Warning signs:**
- Chrome DevTools Memory tab shows growing heap after unmount/remount cycles
- Android Chrome crashes after using the feature 2-3 times
- `performance.memory.usedJSHeapSize` (Chrome-only) keeps increasing

**Prevention:**
1. **Use a persistent worker** -- do NOT terminate the worker on component unmount. Create it once at app level, communicate via messages. The worker holds the singleton pipeline across the app lifecycle.
2. **If the worker must be terminated**, call `pipeline.dispose()` inside the worker before `self.close()`:
   ```typescript
   // In worker
   self.addEventListener('message', async (event) => {
     if (event.data.type === 'dispose') {
       const pipe = await PipelineSingleton.getInstance();
       await pipe.dispose();
       PipelineSingleton.instance = null;
       self.close();
     }
   });
   ```
3. **Guard against React Strict Mode double-mount**: Use a ref to track initialization state and avoid creating duplicate workers.
4. **Keep pipeline arguments stable**: The model ID and task strings must be constants, not dynamically constructed values that change on every render.

**Phase mapping:** Phase 2 (Web Worker implementation) for initial architecture. Phase 3 (integration) for lifecycle management with React components.

**Confidence:** HIGH -- verified via Transformers.js issues #715, #860, #958, and official test patterns showing `model.dispose()` in `afterAll` hooks.

---

### Pitfall 5: Audio Format Conversion -- Wrong Sample Rate or Channel Count

**What goes wrong:** Whisper expects 16kHz mono Float32Array PCM audio. MediaRecorder produces WebM/Opus at the device's native sample rate (typically 44.1kHz or 48kHz), often in stereo. If the audio is not properly resampled and downmixed to mono, Whisper produces garbage output -- not an error, just wrong transcriptions.

**Why it happens:** The conversion pipeline has multiple steps, each of which can silently produce incorrect data:
1. MediaRecorder outputs compressed WebM/Opus blobs
2. `AudioContext.decodeAudioData()` decodes to PCM at the AudioContext's sample rate
3. Channel downmixing (stereo to mono) must extract channel 0 or average channels
4. Resampling from native rate to 16kHz must use proper interpolation

Developers often skip step 4 (assuming the AudioContext handles it) or get step 3 wrong (passing stereo data to Whisper).

**Consequences:**
- Whisper "works" but outputs nonsensical text
- Difficult to debug because there is no error -- just wrong output
- Quality varies between browsers (different default sample rates)

**Warning signs:**
- Transcription quality varies dramatically between browsers
- Short recordings work but longer ones produce gibberish
- German text produces English fragments or vice versa

**Prevention:**
Use `OfflineAudioContext` for reliable resampling:
```typescript
async function convertToWhisperFormat(audioBlob: Blob): Promise<Float32Array> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Resample to 16kHz mono
  const targetSampleRate = 16000;
  const numSamples = Math.round(audioBuffer.duration * targetSampleRate);
  const offlineCtx = new OfflineAudioContext(1, numSamples, targetSampleRate);
  
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);
  
  const resampled = await offlineCtx.startRendering();
  return resampled.getChannelData(0); // mono Float32Array at 16kHz
}
```

Do NOT attempt manual resampling with linear interpolation -- `OfflineAudioContext` uses proper sinc resampling and handles edge cases.

**Phase mapping:** Phase 2 (audio pipeline). This conversion function is foundational and must be correct before any Whisper integration testing.

**Confidence:** HIGH -- verified via Whisper model documentation (16kHz requirement), Web Audio API spec, and Transformers.js server-side audio processing guide.

---

## Moderate Pitfalls

### Pitfall 6: Model Download Without Progress Feedback Feels Broken

**What goes wrong:** The whisper-base model is ~140MB. On first use, the download takes 10-60 seconds depending on connection speed. Without a progress indicator, users think the app is frozen, click repeatedly, or navigate away (canceling the download).

**Why it happens:** The `pipeline()` function accepts a `progress_callback` but developers often forget to wire it up, or they wire it to `console.log` and forget to build UI. The callback fires per-file (encoder, decoder, tokenizer), not as a single unified progress bar.

**Prevention:**
1. Wire `progress_callback` to a UI progress bar from day one
2. Aggregate progress across multiple files (encoder.onnx, decoder.onnx, etc.) into a single percentage
3. Show estimated download size before the user initiates (~140MB)
4. Cache status check: In Transformers.js v4, use `ModelRegistry.is_pipeline_cached()` to skip the progress UI on subsequent loads
5. Disable the record button while the model is loading

**Phase mapping:** Phase 2 (model loading UX). Should be implemented alongside the first pipeline initialization, not deferred.

**Confidence:** HIGH -- verified via Transformers.js progress_callback API and v4 ModelRegistry API.

---

### Pitfall 7: COEP `require-corp` Breaks Existing Cross-Origin Resources

**What goes wrong:** Setting `Cross-Origin-Embedder-Policy: require-corp` causes all cross-origin no-cors requests to require a `Cross-Origin-Resource-Policy: cross-origin` header on the response. External images, fonts, CDN resources, and embedded iframes that lack this header stop loading. The app partially breaks in ways unrelated to Whisper.

**Why it happens:** `require-corp` is the well-known COEP value, and many tutorials recommend it. But it has a blast radius far beyond the Whisper feature -- it affects every resource the page loads.

**Consequences:**
- Mantine UI fonts from CDN may stop loading
- External images in chat messages break (403/blocked)
- Third-party scripts fail
- Existing features regress while adding the new Whisper feature

**Warning signs:**
- Console errors: "blocked by Cross-Origin-Embedder-Policy"
- Broken images/fonts after deploying header changes
- Third-party integrations fail

**Prevention:**
- Use `Cross-Origin-Embedder-Policy: credentialless` instead of `require-corp`. It achieves the same cross-origin isolation for `SharedArrayBuffer` but does not require cross-origin resources to have CORP headers. It simply strips credentials from no-cors cross-origin requests.
- Browser support for `credentialless`: Chrome 96+, Firefox 119+, Safari 18+. This is sufficient for a modern enterprise app.
- Test with `require-corp` first in dev to identify any resources that would break, then switch to `credentialless` for deployment.

**Phase mapping:** Phase 1 (header configuration). Must be tested against the entire existing app, not just the Whisper feature.

**Confidence:** HIGH -- verified via MDN COEP documentation and Chrome Developer Blog.

---

### Pitfall 8: Transferable Objects Not Used for Audio Data

**What goes wrong:** When posting audio data from the main thread to the Web Worker via `postMessage`, the Float32Array is copied (structured clone) rather than transferred. For 2 minutes of 16kHz mono audio, this is ~7.7MB -- a copy takes noticeable time and briefly doubles memory usage.

**Why it happens:** Developers write `worker.postMessage({ audio: float32Array })` without the second argument specifying transferable objects. The structured clone algorithm copies the entire buffer.

**Prevention:**
```typescript
// WRONG -- copies the buffer
worker.postMessage({ type: 'transcribe', audio: audioData });

// CORRECT -- transfers ownership (zero-copy)
worker.postMessage(
  { type: 'transcribe', audio: audioData },
  [audioData.buffer]  // Transfer the underlying ArrayBuffer
);
// audioData is now neutered (unusable) in the main thread
```

Note: After transfer, the original `audioData` in the main thread becomes empty/neutered. This is fine for the record-then-transcribe pattern since the main thread no longer needs the audio.

**Phase mapping:** Phase 2 (Web Worker communication). Simple to get right if known, annoying to debug if missed.

**Confidence:** HIGH -- verified via MDN Transferable Objects documentation.

---

### Pitfall 9: Transformers.js Version and Model ID Confusion

**What goes wrong:** Developers use the wrong package name, version, or model ID. The npm package is `@huggingface/transformers` (v3/v4), NOT the old `@xenova/transformers` (v2, deprecated). Model IDs have shifted from `Xenova/whisper-base` to `onnx-community/whisper-base` for v4-optimized models.

**Why it happens:** Many tutorials, Stack Overflow answers, and blog posts reference the v2 package (`@xenova/transformers`) and `Xenova/` model IDs. The library underwent a significant rebranding and restructuring.

**Consequences:**
- Installing `@xenova/transformers` gets v2 (deprecated, missing features)
- Using `Xenova/whisper-base` model ID may load older, unoptimized ONNX exports
- Version mismatches between `@huggingface/transformers` and `onnxruntime-web` cause cryptic errors

**Prevention:**
- Use `@huggingface/transformers` (v3 stable, v4 latest)
- Use `onnx-community/whisper-base` as the model ID for current ONNX exports
- Pin `onnxruntime-web` to the version that `@huggingface/transformers` depends on (check `package.json` peer deps) -- do NOT install a separate version
- If using v3, be aware that `onnxruntime-web` versions above 1.19.x have reported compatibility issues

**Phase mapping:** Phase 1 (dependency installation). Get this right on day one.

**Confidence:** MEDIUM -- model ID ecosystem is actively evolving; verify the latest recommended model ID against Hugging Face Hub at implementation time.

---

### Pitfall 10: ONNX Runtime WASM Multi-Threading Bug

**What goes wrong:** Even with `SharedArrayBuffer` available, setting `numThreads` greater than 1 may cause hangs or crashes due to a known bug in certain versions of `onnxruntime-web`.

**Why it happens:** There is a documented bug (`microsoft/onnxruntime#14445`) where WASM multi-threading causes deadlocks or incorrect results in some onnxruntime-web versions.

**Prevention:**
- Start with `env.backends.onnx.wasm.numThreads = 1` for reliability
- Test with higher thread counts only after verifying the specific onnxruntime-web version supports it
- Cap threads: `Math.min(navigator.hardwareConcurrency || 4, 8)` to avoid degradation on high-core machines
- Monitor the onnxruntime-web changelog for fixes before enabling multi-threading

**Phase mapping:** Phase 3 (performance optimization). Single-threaded is fine for MVP; multi-threading is an optimization.

**Confidence:** MEDIUM -- the bug status changes with onnxruntime-web releases; verify against the version bundled with your Transformers.js version.

---

## Minor Pitfalls

### Pitfall 11: MediaRecorder MIME Type Varies By Browser

**What goes wrong:** `MediaRecorder` supports different audio codecs across browsers. `audio/webm;codecs=opus` works in Chrome and Firefox but not Safari. Safari supports `audio/mp4` instead. Hardcoding `audio/webm` causes recording to fail on Safari.

**Prevention:**
```typescript
const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
  ? 'audio/webm;codecs=opus'
  : MediaRecorder.isTypeSupported('audio/mp4')
    ? 'audio/mp4'
    : 'audio/webm';
```
The existing `useTranscribe.ts` hardcodes `audio/webm`. The new local transcription hook should use the same pattern but with the fallback above.

**Phase mapping:** Phase 2 (audio recording). The existing `useTranscribe.ts` can serve as a starting point, but needs the MIME type fallback.

**Confidence:** HIGH -- well-documented browser API difference.

---

### Pitfall 12: React Strict Mode Double-Mount Creates Duplicate Workers

**What goes wrong:** In React 19 development mode, `useEffect` runs twice (mount, unmount, remount). If the effect creates a Web Worker, two workers are created, both trying to load the 140MB model simultaneously. This doubles download bandwidth and memory.

**Prevention:**
- Use a ref to track whether the worker has already been initialized
- Use `useRef` to hold the worker instance and only create it if `null`
- The cleanup function must properly terminate the worker on unmount
- The existing codebase already handles this pattern in `useTranscribe.ts` with `mediaRecorderRef`

```typescript
const workerRef = useRef<Worker | null>(null);
useEffect(() => {
  if (workerRef.current) return; // Already initialized
  workerRef.current = new Worker(
    new URL('./whisper.worker.ts', import.meta.url),
    { type: 'module' }
  );
  return () => {
    workerRef.current?.terminate();
    workerRef.current = null;
  };
}, []);
```

**Phase mapping:** Phase 2 (React integration). Standard React pattern but critical for ML workloads.

**Confidence:** HIGH -- standard React 19 behavior.

---

### Pitfall 13: Model Not Cached Across Sessions on Some Browsers

**What goes wrong:** Transformers.js caches model files in the browser's Cache API or IndexedDB. Some browsers have aggressive storage eviction policies. Safari in particular may evict cached data when under storage pressure, forcing a re-download of the 140MB model.

**Prevention:**
- Use `navigator.storage.persist()` to request persistent storage (reduces eviction risk)
- Check cache status before recording starts (using ModelRegistry API in v4 or a manual cache check in v3)
- Show download size estimate if the model needs re-downloading
- Consider a "preload model" button in settings rather than lazy-loading on first record

**Phase mapping:** Phase 3 (UX polish). Not critical for MVP but important for production.

**Confidence:** MEDIUM -- storage eviction behavior varies by browser and is not fully documented.

---

### Pitfall 14: Whisper Language Parameter Must Be Set Correctly

**What goes wrong:** Whisper-base is multilingual. Without specifying `language: 'de'` or `language: 'en'`, the model auto-detects the language, which is unreliable for short recordings and may produce mixed-language output.

**Prevention:**
Pass the language explicitly to the pipeline:
```typescript
const result = await transcriber(audioData, {
  language: selectedLanguage, // 'de' or 'en'
  task: 'transcribe',
});
```

The project spec calls for a language dropdown (de/en) matching the existing speech recognition UI. Wire this value through to the pipeline call.

**Phase mapping:** Phase 2 (pipeline configuration). Simple but easy to forget.

**Confidence:** HIGH -- documented Whisper pipeline parameter.

---

### Pitfall 15: Mobile Browser Crashes with whisper-base

**What goes wrong:** whisper-base (~140MB model weights) requires significant memory for inference. On mobile devices (especially Android Chrome), this frequently causes tab crashes ("Aw, Snap!") during transcription of longer audio.

**Why it happens:** Mobile browsers have stricter memory limits than desktop browsers. The model weights + audio buffer + intermediate tensors can exceed the tab's memory budget on devices with limited RAM.

**Prevention:**
- Consider whisper-tiny (~75MB) as a fallback for mobile devices (detect via `navigator.userAgent` or screen size)
- Set the 2-minute recording limit strictly on mobile
- Use chunked processing (`chunk_length_s: 30, stride_length_s: 5`) for any audio longer than 30 seconds
- Add a try/catch around the transcription call with a user-friendly "transcription failed, please try a shorter recording" message
- Consider disabling the local transcription feature entirely on mobile for v1

**Phase mapping:** Phase 3 (cross-device testing). Accept mobile limitations for MVP; optimize later.

**Confidence:** HIGH -- verified via Transformers.js issues #740, #988 (Chrome crashes on Android).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Infrastructure / Scaffolding | COOP/COEP headers missing (Pitfall 1, 7) | Add headers to Vite plugin AND Caddyfile in the first PR. Use `credentialless`. Test entire app for regressions. |
| Infrastructure / Scaffolding | Vite bundler misconfiguration (Pitfall 2) | Add `optimizeDeps.exclude` and `assetsInclude` to `vite.config.ts` before first import. |
| Infrastructure / Scaffolding | Wrong package/model ID (Pitfall 9) | Use `@huggingface/transformers` (not `@xenova/transformers`). Use `onnx-community/whisper-base`. |
| Web Worker + Pipeline | Worker pattern breaks in production (Pitfall 3) | Use exact `new Worker(new URL(...))` one-liner. Test `vite build` early. |
| Web Worker + Pipeline | Memory leak from undisposed pipeline (Pitfall 4) | Use persistent worker with singleton pattern. Call `dispose()` only on app shutdown. |
| Web Worker + Pipeline | Audio format conversion wrong (Pitfall 5) | Use `OfflineAudioContext` for resampling. Validate 16kHz mono output. |
| Web Worker + Pipeline | No progress feedback during model load (Pitfall 6) | Wire `progress_callback` to UI from day one. |
| Web Worker + Pipeline | Structured clone instead of transfer (Pitfall 8) | Use transferable objects in `postMessage`. |
| Web Worker + Pipeline | Strict Mode double-mount (Pitfall 12) | Guard worker creation with ref check. |
| Integration / Polish | Mobile crashes (Pitfall 15) | Chunked processing, shorter limits, graceful fallback. |
| Integration / Polish | Cache eviction (Pitfall 13) | Request persistent storage, check cache before recording. |
| Integration / Polish | WASM threading bug (Pitfall 10) | Start single-threaded, optimize later. |
| Integration / Polish | MIME type browser differences (Pitfall 11) | Use `isTypeSupported()` fallback chain. |

## Sources

- [MDN: Cross-Origin-Embedder-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy)
- [MDN: Transferable Objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)
- [Vite Issue #3909: COOP/COEP headers on dev server](https://github.com/vitejs/vite/issues/3909)
- [Vite Issue #16536: COOP/COEP on HMR dev server](https://github.com/vitejs/vite/issues/16536)
- [Vite Discussion #15962: ONNX file loading](https://github.com/vitejs/vite/discussions/15962)
- [Vite Issue #5979: Worker code not bundled](https://github.com/vitejs/vite/issues/5979)
- [Vite Issue #10837: Worker import.meta.url in 3rd party modules](https://github.com/vitejs/vite/issues/10837)
- [Transformers.js Issue #860: WebGPU Whisper memory leak](https://github.com/huggingface/transformers.js/issues/860)
- [Transformers.js Issue #958: Zombie memory on page close/reopen](https://github.com/huggingface/transformers.js/issues/958)
- [Transformers.js Issue #988: Chrome crash with Whisper](https://github.com/huggingface/transformers.js/issues/988)
- [Transformers.js Issue #740: Android Chrome crash](https://github.com/huggingface/transformers.js/issues/740)
- [Transformers.js Issue #715: How to unload/destroy a pipeline](https://github.com/huggingface/transformers.js/issues/715)
- [Transformers.js Issue #1016: onnxruntime-web version compatibility](https://github.com/huggingface/transformers.js/issues/1016)
- [Transformers.js Issue #882: WASM multi-threading](https://github.com/huggingface/transformers.js/issues/882)
- [Transformers.js v4 Release Notes](https://huggingface.co/blog/transformersjs-v4)
- [Transformers.js Official Docs: Web Worker pattern](https://huggingface.co/docs/transformers.js/index) (Context7 verified)
- [Chrome Developer Blog: COEP credentialless](https://developer.chrome.com/blog/coep-credentialless-origin-trial)
- [web.dev: COOP and COEP](https://web.dev/articles/coop-coep)
- [vite-plugin-cross-origin-isolation (npm)](https://www.npmjs.com/package/vite-plugin-cross-origin-isolation)
