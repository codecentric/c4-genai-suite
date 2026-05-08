# Roadmap: Lokale Spracherkennung mit Transformers.js

## Overview

This roadmap delivers browser-based Whisper speech recognition as a privacy-preserving alternative to the existing cloud-based transcription options in the c4 GenAI Suite. The journey starts with infrastructure and build configuration (the foundation most likely to cause hard-to-debug issues if wrong), moves through the core ML inference pipeline, then builds the user-facing integration, adds robustness through error handling, and finishes with polish that makes the feature feel production-ready.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Infrastructure & Backend Extension** - Vite/COOP/COEP configuration and extension registration in the backend (completed 2026-05-07)
- [x] **Phase 2: Core Transcription Pipeline** - Web Worker with Whisper inference, audio capture/resampling, and model loading (completed 2026-05-07)
- [ ] **Phase 3: UI Integration** - LocalTranscribeButton component, model download progress, language selection, and i18n
- [x] **Phase 4: Error Handling** - Graceful failure modes for mic denial, browser incompatibility, download failure, and empty results (completed 2026-05-08)
- [x] **Phase 5: Polish & Refinement** - Recording timer, privacy badge, and silence detection for production readiness (completed 2026-05-08)

## Phase Details

### Phase 1: Infrastructure & Backend Extension
**Goal**: The project builds cleanly with Transformers.js support, cross-origin isolation headers are active without breaking existing functionality, and the extension is registered and configurable per assistant
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, EXT-01, EXT-02, EXT-03
**Success Criteria** (what must be TRUE):
  1. `npm run dev` starts successfully with Transformers.js installed and Vite configured for ONNX/Worker bundling
  2. `self.crossOriginIsolated === true` in the browser console when the app is running
  3. All existing app functionality works unchanged after COOP/COEP header changes (login, chat, existing transcription)
  4. The 'transcribe-local' extension appears in the Admin UI extension list and can be toggled on/off per assistant
  5. Activating 'transcribe-local' on an assistant automatically deactivates other speech-to-text extensions (mutual exclusivity)
**Plans:** 2 plans

Plans:

**Wave 1**
- [x] 01-01-PLAN.md -- Walking skeleton: backend extension + i18n + Vite config + Transformers.js install + frontend recognition

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 01-02-PLAN.md -- Regression verification: E2E tests + visual Admin UI checkpoint

### Phase 2: Core Transcription Pipeline
**Goal**: Audio can be recorded, resampled, and transcribed via Whisper running entirely in the browser -- end-to-end pipeline works without any UI
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: WORK-01, WORK-02, WORK-03, WORK-04, WORK-05, AUDIO-01, AUDIO-02, AUDIO-03, AUDIO-04, MODEL-01, MODEL-02
**Success Criteria** (what must be TRUE):
  1. Calling the useLocalTranscribe hook records audio, sends it to a Web Worker, and returns transcribed text without blocking the main thread
  2. The Whisper model downloads on first use and loads instantly from cache on subsequent uses (no re-download)
  3. Audio is correctly resampled to 16kHz mono Float32Array and transferred to the Worker without copying (zero-copy via Transferable)
  4. Recording automatically stops after 2 minutes
  5. Transcription works in both German and English when the language parameter is set
**Plans:** 2 plans

Plans:

**Wave 1**
- [x] 02-01-PLAN.md -- Whisper Web Worker (singleton pipeline, WebGPU/WASM detection, progress reporting, language mapping) + audio resampling utility

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 02-02-PLAN.md -- useLocalTranscribe hook (state machine, recording, Worker orchestration, model lifecycle) + i18n keys

### Phase 3: UI Integration
**Goal**: Users can see and interact with the local transcription feature in the chat interface, including model download progress and language selection
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-07, MODEL-03, MODEL-04, I18N-01, I18N-02
**Success Criteria** (what must be TRUE):
  1. When 'transcribe-local' extension is active on an assistant, a microphone button appears in the ChatInput area
  2. The button shows three distinct visual states: idle (mic icon), recording (pulsing red), and transcribing (spinner)
  3. A progress bar with percentage and MB downloaded appears during first-time model download, and is skipped when model is already cached
  4. A language dropdown (de/en) is available on the button, and switching language changes the transcription output language
  5. All UI text is available in both German and English, and all interactive elements have accessibility labels
**Plans:** 2 plans
**UI hint**: yes

Plans:

**Wave 1**
- [x] 03-01-PLAN.md -- Full vertical slice: hook cancelDownload + i18n keys + LocalTranscribeButton + DownloadProgressBanner + ChatInput wiring

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 03-02-PLAN.md -- Unit tests for LocalTranscribeButton and DownloadProgressBanner + human verification checkpoint

### Phase 4: Error Handling
**Goal**: All failure modes produce clear, actionable feedback instead of silent failures or cryptic errors
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: ERR-01, ERR-02, ERR-03, ERR-04
**Success Criteria** (what must be TRUE):
  1. Denying microphone permission shows a toast explaining what happened and how to fix it
  2. On browsers without Web Worker or WASM support, the transcribe button does not appear (graceful absence, not a crash)
  3. A failed model download shows a toast with a retry hint (not a generic error)
  4. An empty transcription result shows a meaningful message instead of silently doing nothing
**Plans:** 2 plans

Plans:

**Wave 1**
- [x] 04-01-PLAN.md -- Worker error codes + hook isSupported/error mapping/empty check + ChatInput gating + i18n keys

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 04-02-PLAN.md -- Fix broken tests + new error handling tests + human verification checkpoint

### Phase 5: Polish & Refinement
**Goal**: The feature feels production-ready with recording feedback, privacy communication, and edge-case handling
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: UI-05, UI-06, ERR-05
**Success Criteria** (what must be TRUE):
  1. A recording timer shows elapsed time relative to the 2-minute maximum (e.g. "0:42 / 2:00") while recording
  2. A visual indicator communicates that audio is processed locally and never leaves the browser
  3. Recording silence (no speech signal) produces a "Keine Sprache erkannt" / "No speech detected" message instead of Whisper hallucination text
**Plans:** 2 plans

Plans:

**Wave 1**
- [x] 05-01-PLAN.md -- Worker silence detection (RMS + hallucination filter) + hook elapsed time + RecordingTimer + PrivacyBadge + ChatInput integration + i18n keys

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 05-02-PLAN.md -- Component tests + Worker/hook test extensions + human verification checkpoint

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure & Backend Extension | 2/2 | Complete | 2026-05-07 |
| 2. Core Transcription Pipeline | 0/2 | Planned | - |
| 3. UI Integration | 0/2 | Planned | - |
| 4. Error Handling | 2/2 | Complete | 2026-05-08 |
| 5. Polish & Refinement | 2/2 | Complete | 2026-05-08 |
