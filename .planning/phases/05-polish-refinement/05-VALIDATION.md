---
phase: 5
slug: polish-refinement
status: compliant
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-08
validated: 2026-05-08
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.4 |
| **Config file** | `frontend/vite.config.ts` (test section, lines 18-38) |
| **Quick run command** | `cd frontend && npx vitest run` |
| **Full suite command** | `cd frontend && npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run`
- **After every plan wave:** Run `cd frontend && npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | UI-05 | — | N/A | unit | `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts -t "elapsedSeconds"` | ✅ | ✅ green |
| 05-01-02 | 01 | 1 | UI-05 | — | N/A | unit | `cd frontend && npx vitest run src/pages/chat/conversation/RecordingTimer.ui-unit.spec.tsx` | ✅ | ✅ green |
| 05-01-03 | 01 | 1 | UI-05 | — | N/A | unit | `cd frontend && npx vitest run src/pages/chat/conversation/RecordingTimer.ui-unit.spec.tsx -t "warning"` | ✅ | ✅ green |
| 05-01-04 | 01 | 1 | UI-06 | — | N/A | unit | `cd frontend && npx vitest run src/pages/chat/conversation/PrivacyBadge.ui-unit.spec.tsx` | ✅ | ✅ green |
| 05-01-05 | 01 | 1 | ERR-05 | — | Transcription text auto-escaped by React | unit | `cd frontend && npx vitest run src/workers/whisper.worker.ui-unit.spec.ts -t "silence"` | ✅ | ✅ green |
| 05-01-06 | 01 | 1 | ERR-05 | — | Worker same-origin, type-safe messages | unit | `cd frontend && npx vitest run src/workers/whisper.worker.ui-unit.spec.ts -t "hallucination"` | ✅ | ✅ green |
| 05-01-07 | 01 | 1 | ERR-05 | — | N/A | unit | `cd frontend && npx vitest run src/hooks/useLocalTranscribe.ui-unit.spec.ts -t "silence"` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `frontend/src/pages/chat/conversation/RecordingTimer.ui-unit.spec.tsx` — 8 tests for UI-05 (format, colors, accessibility)
- [x] `frontend/src/pages/chat/conversation/PrivacyBadge.ui-unit.spec.tsx` — 5 tests for UI-06 (rendering, tooltip, focus, color)
- [x] `frontend/src/hooks/useLocalTranscribe.ui-unit.spec.ts` — extended with 5 tests for `elapsedSeconds` state and `silence` status handling
- [x] `frontend/src/workers/whisper.worker.ui-unit.spec.ts` — extended with 7 tests for RMS check, hallucination filter, `silence` status

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Timer visual red color transition at 1:45 | UI-05 | CSS color rendering not verifiable in unit tests | 1. Start recording, 2. Wait until 1:45 elapsed, 3. Verify timer text turns red |
| Privacy badge tooltip appears on hover | UI-06 | Tooltip hover interaction requires browser | 1. Hover over privacy badge, 2. Verify tooltip text appears |
| Silence produces "No speech detected" toast | ERR-05 | Requires actual microphone silence + Whisper | 1. Start recording with mic muted, 2. Wait for auto-stop, 3. Verify toast shows |

---

## Validation Audit 2026-05-08

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 7 tasks already have automated test coverage (25 new tests across 4 files). Full suite: 176 tests, 0 failures.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-08
