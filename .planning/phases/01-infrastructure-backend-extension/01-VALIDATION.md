---
phase: 1
slug: infrastructure-backend-extension
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-07
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend), jest (backend), playwright (e2e) |
| **Config file** | `frontend/vitest.config.ts`, `backend/jest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `cd backend && npx jest --runInBand --forceExit` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npx jest --runInBand --forceExit`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | INFRA-01 | — | N/A | build | `cd frontend && npx vite build 2>&1 \| head -20` | ✅ | ⬜ pending |
| 1-01-02 | 01 | 1 | INFRA-02 | — | N/A | manual | Browser console: `self.crossOriginIsolated` | — | ⬜ pending |
| 1-01-03 | 01 | 1 | INFRA-03 | — | N/A | build | `ls node_modules/@huggingface/transformers/package.json` | ✅ | ⬜ pending |
| 1-01-04 | 01 | 1 | INFRA-04 | — | N/A | e2e | `npm run test:e2e` | ✅ | ⬜ pending |
| 1-01-05 | 01 | 1 | EXT-01 | — | N/A | unit | `cd backend && npx jest --runInBand extensions` | ✅ | ⬜ pending |
| 1-01-06 | 01 | 1 | EXT-02 | — | N/A | e2e | Admin UI toggle test | ✅ | ⬜ pending |
| 1-01-07 | 01 | 1 | EXT-03 | — | N/A | unit | Mutual exclusivity via group field | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cross-origin isolation active | INFRA-02 | Requires browser console check | Open app, press F12, run `self.crossOriginIsolated` in console |
| Extension visible in Admin UI | EXT-02 | Visual UI check | Navigate to Admin > Assistants > Extensions, verify 'transcribe-local' appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
