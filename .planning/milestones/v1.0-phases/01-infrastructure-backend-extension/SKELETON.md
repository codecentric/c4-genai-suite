# Walking Skeleton -- Lokale Spracherkennung (c4 GenAI Suite)

**Phase:** 1
**Generated:** 2026-05-07

## Capability Proven End-to-End

> An administrator can see the "Lokale Spracherkennung" / "Local Speech Recognition" extension in the Admin UI, activate it on an assistant with a default language selection (de/en), and the frontend build includes Transformers.js with cross-origin isolation headers active -- proving the new feature's stack works through the existing extension architecture.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Extension pattern | Marker extension (type: 'other', empty middlewares) | Same pattern as existing speech-to-text and transcribe-azure; logic lives in frontend, backend provides config and mutual exclusivity |
| Mutual exclusivity | group: 'speech-to-text' | Reuses existing group field enforcement; no custom code needed |
| Config field | defaultLanguage as select dropdown (de/en) | Per D-01, D-02, D-03; follows azure-transcribe's format: 'select' + examples pattern |
| Cross-origin isolation | COEP: credentialless (dev server only) | Per D-04, D-06; avoids HMR breakage of require-corp; Safari limitation accepted |
| Transformers.js bundling | optimizeDeps.exclude + worker.format: 'es' | WASM files cannot be pre-bundled by Vite; ES module workers required for Transformers.js v4 |
| Frontend recognition | Hardcoded name check in ChatInput.tsx | Follows existing pattern; 'transcribe-local' added to voiceExtensions filter |

## Stack Touched in Phase 1

- [x] Extension registered in backend (`@Extension()` decorator + module.ts providers)
- [x] Extension visible in admin UI (auto-discovered by ExplorerService)
- [x] Frontend recognizes extension name ('transcribe-local' in ChatInput.tsx filter)
- [x] Build succeeds with Transformers.js + COOP/COEP headers
- [x] Existing functionality unbroken (E2E regression suite)

## Out of Scope (Deferred to Later Slices)

- Web Worker with Whisper inference pipeline (Phase 2)
- Audio capture, resampling, and recording controls (Phase 2)
- Model download, caching, and progress UI (Phase 2/3)
- LocalTranscribeButton component with recording states (Phase 3)
- Language selection dropdown in chat UI (Phase 3)
- Error handling for mic denial, browser compat, download failure (Phase 4)
- Recording timer, privacy badge, silence detection (Phase 5)
- Production COOP/COEP headers (separate from this milestone)
- Safari COEP:credentialless support (browser limitation, not in scope)

## Subsequent Slice Plan

- Phase 2: Audio can be recorded, resampled, and transcribed via Whisper in a Web Worker -- end-to-end pipeline without UI
- Phase 3: Users see and interact with LocalTranscribeButton, model download progress, and language selection in chat
- Phase 4: All failure modes produce clear, actionable feedback (mic denial, browser compat, download failure, empty results)
- Phase 5: Recording timer, privacy badge, and silence detection for production readiness
