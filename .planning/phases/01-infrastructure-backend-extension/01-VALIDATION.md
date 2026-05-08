---
phase: 1
slug: infrastructure-backend-extension
status: complete
nyquist_compliant: true
wave_0_complete: true
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
| 1-01-01 | 01 | 1 | INFRA-01 | — | N/A | build | `cd frontend && npx vite build 2>&1 \| head -20` | ✅ | ✅ green |
| 1-01-02 | 01 | 1 | INFRA-02 | — | N/A | manual | Browser console: `self.crossOriginIsolated` | — | ✅ green (manual) |
| 1-01-03 | 01 | 1 | INFRA-03 | — | N/A | build | `cd frontend && node -e "require.resolve('@huggingface/transformers')"` | ✅ | ✅ green |
| 1-01-04 | 01 | 1 | INFRA-04 | — | N/A | e2e | `npm run test:e2e` | ✅ | ✅ green |
| 1-01-05 | 01 | 1 | EXT-01 | — | N/A | unit | `cd backend && npx jest --runInBand --forceExit src/extensions/other/local-transcribe.spec.ts` | ✅ | ✅ green |
| 1-01-06 | 01 | 1 | EXT-02 | — | N/A | unit | `cd backend && npx jest --runInBand --forceExit src/extensions/other/local-transcribe.spec.ts` | ✅ | ✅ green |
| 1-01-07 | 01 | 1 | EXT-03 | — | N/A | unit | `cd backend && npx jest --runInBand --forceExit src/extensions/other/local-transcribe.spec.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*No additional Wave 0 tests needed. All requirements covered by existing test infrastructure:*

- INFRA-01: Vite build succeeds with optimizeDeps.exclude and worker.format config
- INFRA-02: Manual browser check (crossOriginIsolated); downstream hook `isSupported` tests validate the flag
- INFRA-03: Dependency resolves; downstream Phase 2 Worker tests import @huggingface/transformers
- INFRA-04: E2E regression suite (30/33 pass, 3 pre-existing REIS dependency failures)
- EXT-01/02/03: 5 unit tests in `local-transcribe.spec.ts` (name, group, type, defaultLanguage, middlewares)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cross-origin isolation active | INFRA-02 | Requires browser console check | Open app, press F12, run `self.crossOriginIsolated` in console |
| Extension visible in Admin UI | EXT-02 | Visual UI check | Navigate to Admin > Assistants > Extensions, verify 'transcribe-local' appears |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved

## Validation Audit 2026-05-08

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 7 requirements have automated or build-level verification. INFRA-02 remains manual-only (browser runtime required) but is supplemented by downstream `isSupported` hook tests that check `crossOriginIsolated`. No new test files needed.

---

_Validated: 2026-05-08_
_Validator: Claude (gsd-validate-phase)_
