---
milestone: v1
audited: 2026-05-08T21:00:00Z
status: tech_debt
scores:
  requirements: 34/34
  phases: 5/5
  integration: 7/7
  flows: 7/7
gaps:
  requirements: []
  integration:
    - id: "WARNING-01"
      description: "DownloadProgressBanner 'Ready!' state unreachable — parent unmounts banner before internal timer fires"
      affected_requirements: [MODEL-04, UI-04]
      severity: warning
    - id: "WARNING-02"
      description: "Worker instantiated for all ChatInput renders, not just transcribe-local assistants"
      affected_requirements: [INFRA-03]
      severity: warning
    - id: "WARNING-03"
      description: "no_audio and transcription_failed Worker error codes fall through to generic handler — fragile but functional"
      affected_requirements: [ERR-01]
      severity: warning
    - id: "WARNING-04"
      description: "Orphaned i18n key loadFailed defined in en.ts/de.ts/index.ts but never referenced in production code"
      affected_requirements: [I18N-01]
      severity: warning
  flows: []
tech_debt:
  - phase: documentation
    items:
      - "REQUIREMENTS.md: 21 checkboxes stale ([ ] but should be [x]) for Phase 2-4 requirements"
      - "REQUIREMENTS.md: Traceability table Status column shows 'Pending' for 31/34 requirements (only UI-05, UI-06, ERR-05 updated to 'Verified')"
      - "Phase 4 SUMMARY files (04-01, 04-02): Missing requirements_completed frontmatter field"
      - "Phase 5 SUMMARY files (05-01, 05-02): Missing requirements_completed frontmatter field"
      - "Phase 3 SUMMARY (03-02): I18N-01 omitted from requirements_completed frontmatter"
      - "ROADMAP.md progress table: Phase 2 and 3 show 0/2 plans complete (should be 2/2)"
  - phase: 03-ui-integration
    items:
      - "LocalTranscribeButton.ui-unit.spec.tsx: 79 lines (1 short of plan minimum 80)"
      - "DownloadProgressBanner.ui-unit.spec.tsx: 52 lines (8 short of plan minimum 60)"
  - phase: integration
    items:
      - "WARNING-01: DownloadProgressBanner 'Ready!' state is dead code — banner unmounted by parent before timer fires"
      - "WARNING-02: Worker instantiated for non-transcribe-local assistants — minimal overhead but unnecessary"
      - "WARNING-03: no_audio/transcription_failed error codes use generic fallback handler"
      - "WARNING-04: Orphaned i18n key 'loadFailed' — dead code"
nyquist:
  compliant_phases: [1, 2, 3, 4, 5]
  partial_phases: []
  missing_phases: []
  overall: COMPLIANT
---

# Milestone v1 Audit: Lokale Spracherkennung mit Transformers.js

**Audited:** 2026-05-08
**Status:** tech_debt (all requirements met, no blockers, accumulated documentation + code debt)

## Requirements Coverage (34/34)

### 3-Source Cross-Reference

| REQ-ID | Description | VERIFICATION | SUMMARY FM | REQ.md | Final |
|--------|-------------|-------------|------------|--------|-------|
| INFRA-01 | Vite config for ONNX/Worker bundling | SATISFIED | 01-01 | [x] | satisfied |
| INFRA-02 | COOP/COEP headers (credentialless) | SATISFIED | 01-01 | [x] | satisfied |
| INFRA-03 | @huggingface/transformers installed | SATISFIED | 01-01 | [x] | satisfied |
| INFRA-04 | No regression after header changes | SATISFIED | 01-02 | [x] | satisfied |
| EXT-01 | Extension registered in backend | SATISFIED | 01-01 | [x] | satisfied |
| EXT-02 | Extension configurable per assistant | SATISFIED | 01-01 | [x] | satisfied |
| EXT-03 | Mutual exclusivity with other speech extensions | SATISFIED | 01-01 | [x] | satisfied |
| WORK-01 | Whisper inference in Web Worker | SATISFIED | 02-01 | [ ] | satisfied* |
| WORK-02 | Singleton pipeline in Worker | SATISFIED | 02-01 | [ ] | satisfied* |
| WORK-03 | WebGPU auto-detection with WASM fallback | SATISFIED | 02-01 | [ ] | satisfied* |
| WORK-04 | Download progress reporting to main thread | SATISFIED | 02-01 | [ ] | satisfied* |
| WORK-05 | Language parameter de/en | SATISFIED | 02-01 | [ ] | satisfied* |
| AUDIO-01 | Audio capture via MediaRecorder | SATISFIED | 02-02 | [ ] | satisfied* |
| AUDIO-02 | Resampling to 16kHz mono Float32Array | SATISFIED | 02-01 | [ ] | satisfied* |
| AUDIO-03 | Transferable zero-copy transfer | SATISFIED | 02-02 | [ ] | satisfied* |
| AUDIO-04 | 2-minute auto-stop | SATISFIED | 02-02 | [ ] | satisfied* |
| MODEL-01 | On-demand model download | SATISFIED | 02-02 | [ ] | satisfied* |
| MODEL-02 | Browser caching via Transformers.js | SATISFIED | 02-02 | [ ] | satisfied* |
| MODEL-03 | Download progress bar with %/MB | SATISFIED | 03-02 | [ ] | satisfied* |
| MODEL-04 | Cached model skips progress bar | SATISFIED | 03-02 | [ ] | satisfied* |
| UI-01 | Mic button with recording status | SATISFIED | 03-02 | [ ] | satisfied* |
| UI-02 | Red pulse during recording | SATISFIED | 03-02 | [ ] | satisfied* |
| UI-03 | Loading spinner during transcription | SATISFIED | 03-02 | [ ] | satisfied* |
| UI-04 | Language dropdown de/en | SATISFIED | 03-02 | [ ] | satisfied* |
| UI-05 | Recording timer (M:SS / 2:00) | SATISFIED | body only | [x] | satisfied** |
| UI-06 | Privacy badge/indicator | SATISFIED | body only | [x] | satisfied** |
| UI-07 | ChatInput recognizes transcribe-local | SATISFIED | 03-02 | [ ] | satisfied* |
| ERR-01 | Mic denied toast | SATISFIED | missing | [ ] | satisfied** |
| ERR-02 | Browser incompatible graceful absence | SATISFIED | missing | [ ] | satisfied** |
| ERR-03 | Download failed toast with retry | SATISFIED | missing | [ ] | satisfied** |
| ERR-04 | Empty transcription toast | SATISFIED | missing | [ ] | satisfied** |
| ERR-05 | Silence detection instead of hallucination | SATISFIED | missing | [x] | satisfied** |
| I18N-01 | All UI texts in de/en | SATISFIED | missing | [ ] | satisfied** |
| I18N-02 | Accessibility labels on all elements | SATISFIED | 03-02 | [ ] | satisfied* |

\* REQUIREMENTS.md checkbox stale (should be [x])
\** SUMMARY frontmatter incomplete (requirements_completed field missing); verified manually via VERIFICATION.md evidence

**Orphaned requirements:** 0 (all 34 requirements appear in at least one VERIFICATION.md with SATISFIED status)

## Phase Verifications (5/5)

| Phase | Score | Status | Anti-Patterns | Requirements |
|-------|-------|--------|---------------|-------------|
| 1: Infrastructure & Backend Extension | 5/5 | passed | None | 7/7 |
| 2: Core Transcription Pipeline | 5/5 | human_needed | None | 11/11 |
| 3: UI Integration | 5/5 | human_needed | None | 9/9 |
| 4: Error Handling | 4/4 | human_needed | None | 4/4 |
| 5: Polish & Refinement | 3/3 | passed | None | 3/3 |

**Human verification:** All phases have human verification items requiring a running browser with real hardware (microphone, network, Whisper model). Phase 3 executor self-reported human verification as "APPROVED" with model change (fp16 -> q8, whisper-base -> whisper-small).

## Cross-Phase Integration (7/7 Flows Wired)

| # | Flow | Status | Key Requirements |
|---|------|--------|-----------------|
| 1 | Extension registration -> ChatInput -> Button rendering | WIRED | EXT-01, EXT-02, EXT-03, UI-01 |
| 2 | Worker -> model loading -> transcription -> text output | WIRED | WORK-01-05, AUDIO-01-04, MODEL-01-02 |
| 3 | Worker error -> hook mapping -> toast display | WIRED | ERR-01, ERR-03 |
| 4 | Silence detection -> hook handler -> toast | WIRED | ERR-05 |
| 5 | Download progress -> hook state -> DownloadProgressBanner | WIRED | MODEL-03, MODEL-04 |
| 6 | Recording start -> timer display -> auto-stop | WIRED | UI-05, AUDIO-04 |
| 7 | isSupported check -> button/banner visibility gating | WIRED | ERR-02, UI-03 |

All cross-phase connections verified. No broken flows. 176/176 frontend tests pass.

## Integration Warnings (4, non-blocking)

| ID | Description | Severity | Requirements |
|----|-------------|----------|--------------|
| WARNING-01 | DownloadProgressBanner "Ready!" state unreachable (parent unmounts before timer) | Warning | MODEL-04, UI-04 |
| WARNING-02 | Worker created for all assistants, not just transcribe-local | Warning | INFRA-03 |
| WARNING-03 | no_audio/transcription_failed error codes use generic fallback | Warning | ERR-01 |
| WARNING-04 | Orphaned i18n key `loadFailed` (dead code) | Warning | I18N-01 |

## Nyquist Compliance (5/5 Compliant)

| Phase | VALIDATION.md | nyquist_compliant | wave_0_complete |
|-------|---------------|-------------------|-----------------|
| 1 | exists | true | true |
| 2 | exists | true | true |
| 3 | exists | true | true |
| 4 | exists | true | true |
| 5 | exists | true | true |

**Overall:** COMPLIANT

## Tech Debt Summary

### Documentation Debt (6 items)
1. REQUIREMENTS.md: 21 checkboxes stale ([ ] but functionally satisfied)
2. REQUIREMENTS.md: Traceability table shows "Pending" for 31/34 requirements
3. Phase 4 SUMMARYs: Missing `requirements_completed` frontmatter
4. Phase 5 SUMMARYs: Missing `requirements_completed` frontmatter
5. Phase 3 SUMMARY (03-02): I18N-01 omitted from `requirements_completed`
6. ROADMAP.md progress table: Phase 2 and 3 show "0/2 Planned" (both complete)

### Code Debt (4 items)
1. DownloadProgressBanner "Ready!" state is dead code (WARNING-01)
2. Worker instantiated for non-transcribe-local assistants (WARNING-02)
3. Error code fallback handler fragile for non-download codes (WARNING-03)
4. Orphaned i18n key `loadFailed` (WARNING-04)

### Test Debt (2 items)
1. LocalTranscribeButton tests: 79 lines (1 below plan minimum)
2. DownloadProgressBanner tests: 52 lines (8 below plan minimum)

**Total: 12 items across 3 categories**

## Test Metrics

| Suite | Result | Notes |
|-------|--------|-------|
| Frontend (vitest) | 176/176 pass | 29 test files, 0 failures |
| Backend (jest) | 225/225 pass | 44 suites |
| E2E (Chromium) | 30/33 pass | 3 pre-existing REIS dependency failures |
| TypeScript | 0 errors | Clean compilation |

---

_Audited: 2026-05-08T21:00:00Z_
_Auditor: Claude (gsd-audit-milestone)_
