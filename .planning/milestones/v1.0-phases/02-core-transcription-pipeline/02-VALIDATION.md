---
phase: 2
slug: core-transcription-pipeline
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-07
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `frontend/vite.config.ts` (test section) |
| **Quick run command** | `cd frontend && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd frontend && npm run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd frontend && npm run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | WORK-01..05, AUDIO-02 | — | N/A | unit | `cd frontend && npx vitest run src/workers/whisper.worker.ui-unit.spec.ts` | Wave 0 | ⬜ pending |
| 02-01-02 | 01 | 1 | AUDIO-02 | — | N/A | unit | `cd frontend && npx vitest run src/lib/audio-utils.ui-unit.spec.ts` | Wave 0 | ⬜ pending |
| 02-02-01 | 02 | 2 | — | — | N/A | grep | `grep -c 'localTranscribe' frontend/src/texts/languages/en.ts` | Wave 0 | ⬜ pending |
| 02-02-02 | 02 | 2 | AUDIO-01, AUDIO-03, AUDIO-04, MODEL-01, MODEL-02 | — | N/A | unit | `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts` | Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/workers/whisper.worker.ui-unit.spec.ts` — stubs for WORK-01..05
- [ ] `frontend/src/lib/audio-utils.ui-unit.spec.ts` — stubs for AUDIO-02
- [ ] `frontend/src/hooks/useLocalTranscribe.ui-unit.spec.ts` — stubs for AUDIO-01, AUDIO-03, AUDIO-04, MODEL-01, MODEL-02

*Existing vitest infrastructure covers test framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Audio recording in browser | AUDIO-01 | Requires real microphone access | Open browser, grant mic permission, verify recording starts |
| Model download from HuggingFace | MODEL-01 | Requires network + IndexedDB | Clear cache, trigger first download, verify progress events |
| WebGPU/WASM fallback | WORK-03 | Hardware-dependent | Test on devices with/without WebGPU support |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
