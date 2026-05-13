---
phase: 3
slug: ui-integration
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-07
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend) |
| **Config file** | `frontend/vite.config.ts` (test section) |
| **Quick run command** | `cd frontend && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd frontend && npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx tsc --noEmit`
- **After every plan wave:** Run `cd frontend && npx vitest run && npm run lint`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | I18N-01, UI-01 | — | N/A | type-check | `cd frontend && npx tsc --noEmit` | ✅ | ⬜ pending |
| 03-01-02 | 01 | 1 | UI-01, UI-02, UI-03, UI-04, UI-07, MODEL-03, MODEL-04, I18N-02 | T-03-01, T-03-02, T-03-03 | Language from fixed enum, no PII in progress data | type-check + lint | `cd frontend && npx tsc --noEmit && npm run lint` | ✅ | ⬜ pending |
| 03-02-01 | 02 | 2 | UI-01, UI-02, UI-03, UI-04, UI-07, MODEL-03, MODEL-04, I18N-02 | — | N/A | unit | `cd frontend && npx vitest run --testPathPattern='LocalTranscribeButton\|DownloadProgressBanner'` | ❌ created in task | ⬜ pending |
| 03-02-02 | 02 | 2 | ALL | — | N/A | checkpoint:human-verify | Manual browser verification | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing vitest infrastructure covers framework needs. Test files are created in Plan 02 Task 1 (Wave 2) which runs before the human checkpoint.

*No separate Wave 0 needed — test infrastructure already exists.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Microphone button visual states (idle/recording/transcribing) | UI-02 | Visual verification of CSS animation states | Start recording, verify red pulse; start transcribing, verify spinner |
| Download progress banner appearance during real download | MODEL-03 | Requires real model download (~140MB) | Clear model cache, click mic, verify banner with progress bar |
| Language dropdown interaction | UI-04 | Interactive dropdown behavior | Click chevron, select language, verify dropdown closes and selection persists |
| Cancel download returns to idle | D-03 | Full integration test with worker | Start download, click cancel X, verify button returns to idle and retry works |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-07
