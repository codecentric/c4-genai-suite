---
phase: 4
slug: error-handling
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-08
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend) |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npx vitest run src/hooks/useLocalTranscribe` |
| **Full suite command** | `cd frontend && npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run src/hooks/useLocalTranscribe`
- **After every plan wave:** Run `cd frontend && npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | ERR-01 | — | N/A (already implemented) | unit | `npx vitest run useLocalTranscribe` | TBD | ⬜ pending |
| TBD | TBD | TBD | ERR-02 | — | Button hidden when capability missing | unit | `npx vitest run useLocalTranscribe` | TBD | ⬜ pending |
| TBD | TBD | TBD | ERR-03 | — | Network-aware download error messages | unit | `npx vitest run useLocalTranscribe` | TBD | ⬜ pending |
| TBD | TBD | TBD | ERR-04 | — | Empty transcription shows info toast | unit | `npx vitest run useLocalTranscribe` | TBD | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Browser without Worker/WASM hides button | ERR-02 | Requires testing in actual unsupported browser | Open in Safari iOS < 16.4 or disable SharedArrayBuffer headers |

*All other phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
