# Phase 2: Core Transcription Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 02-core-transcription-pipeline
**Areas discussed:** Model variant & quantization, Model loading trigger, Hook API contract for Phase 3, Specific HuggingFace model ID

---

## Model Variant & Quantization

### Quantization level

| Option | Description | Selected |
|--------|-------------|----------|
| fp16 | ~145MB total. Near-identical accuracy to fp32. Matches ~140MB project estimate. Safe for encoder sensitivity. | ✓ |
| q8 (int8) | ~77MB total. Half the download of fp16, but Whisper encoder is known to be sensitive to quantization. May affect German transcription quality. | |
| fp32 | ~290MB total. Maximum quality, but double the download. Overkill since fp16 is nearly identical. | |

**User's choice:** fp16
**Notes:** Aligns with project planning estimate of ~140MB. Whisper encoder sensitivity to quantization was the deciding factor.

### Mixed quantization

| Option | Description | Selected |
|--------|-------------|----------|
| fp16 for both | Simple, consistent. ~145MB total. No risk of decoder quality issues. | ✓ |
| fp16 encoder + q8 decoder | ~64MB total. Encoder stays high quality. Adds complexity and risk. | |

**User's choice:** fp16 for both
**Notes:** None — straightforward choice for consistency.

### Auto-stop UX

| Option | Description | Selected |
|--------|-------------|----------|
| Toast notification | Same pattern as existing useTranscribe: toast.info when max duration reached. | ✓ |
| Silent auto-stop | Just stop and transcribe without notifying. | |

**User's choice:** Toast notification
**Notes:** Consistency with existing hook behavior.

---

## Model Loading Trigger

### Download trigger

| Option | Description | Selected |
|--------|-------------|----------|
| On first record click | Download starts when user clicks mic for the first time. User sees progress bar, then recording begins. | ✓ |
| On hook mount (eager) | Download starts when user opens chat with extension active. Burns bandwidth even if user never records. | |
| Explicit 'prepare' step | Separate button/action to download model before recording. Adds UI complexity. | |

**User's choice:** On first record click
**Notes:** Simple mental model for users.

### Recording during download

| Option | Description | Selected |
|--------|-------------|----------|
| Wait for model, then record | Show download progress, then auto-start recording when ready. No risk of wasted audio. | ✓ |
| Record immediately, download in parallel | Start recording while model downloads. Saves time if download is fast, but audio wasted if download fails. | |

**User's choice:** Wait for model, then record
**Notes:** Cleaner flow — no edge case of failed download with recorded audio.

### Cached model pre-loading

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-load from cache on mount | When model is cached, loading from IndexedDB is ~1-2s. Instant recording on click. | ✓ |
| Still wait for record click | Consistent behavior but forces ~1-2s delay every time. | |

**User's choice:** Pre-load from cache on mount
**Notes:** Important for perceived performance on subsequent uses.

---

## Hook API Contract for Phase 3

### State machine

| Option | Description | Selected |
|--------|-------------|----------|
| Extended states | idle, downloading, loading, recording, transcribing, error. Phase 3 can show specific UI per state. | ✓ |
| Match existing hook | idle, recording, transcribing, error. Lumps downloading/loading into transcribing. | |
| Granular with sub-states | Top-level: idle, busy, error. Sub-state object with stage, progress, error. | |

**User's choice:** Extended states
**Notes:** Gives Phase 3 full control over per-state UI.

### Progress API

| Option | Description | Selected |
|--------|-------------|----------|
| Progress object | { loaded, total, percentage }. Phase 3 can show "X MB / Y MB" detail. | ✓ |
| Just percentage | Single number 0-100. Simpler but no MB detail. | |
| Callback pattern | onProgress callback. Breaks React state pattern. | |

**User's choice:** Progress object
**Notes:** Transformers.js already reports loaded/total bytes — direct pass-through.

### Language API

| Option | Description | Selected |
|--------|-------------|----------|
| Hook accepts language param | useLocalTranscribe({ language: 'de', ... }). Phase 3 manages language dropdown. | ✓ |
| Hook reads extension config | Hook internally reads admin-configured defaultLanguage. More coupled. | |

**User's choice:** Hook accepts language param
**Notes:** Clean separation — hook doesn't care where language comes from.

---

## Specific HuggingFace Model ID

### Model repository

| Option | Description | Selected |
|--------|-------------|----------|
| onnx-community/whisper-base | Official ONNX-community repo. All quantization variants. Updated for Transformers.js v3+. | ✓ |
| Xenova/whisper-base | Legacy v1/v2 repo. Still works with v3 but older conversion. | |
| You decide | Let Claude pick. | |

**User's choice:** onnx-community/whisper-base
**Notes:** Official repo, maintained by HuggingFace team, has all fp16 variants needed.

### Version pinning

| Option | Description | Selected |
|--------|-------------|----------|
| Use latest | Always pull latest version. Simpler, gets bugfixes. | ✓ |
| Pin to specific revision | Lock to commit hash. Maximum reproducibility. | |

**User's choice:** Use latest
**Notes:** Model format is stable, pinning adds maintenance burden.

---

## Claude's Discretion

- Worker communication protocol (message types, error shapes)
- Web Worker lifecycle (singleton vs per-use)
- Audio resampling implementation details
- WebGPU detection and WASM fallback strategy
- Internal Worker error handling and retry behavior

## Deferred Ideas

None — discussion stayed within phase scope
