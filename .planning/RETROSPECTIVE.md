# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 -- Lokale Spracherkennung

**Shipped:** 2026-05-08
**Phases:** 6 | **Plans:** 12

### What Was Built
- Browser-based Whisper speech recognition via Transformers.js (whisper-small q8, ~240MB)
- Full transcription pipeline: Web Worker singleton, audio capture/resampling, model download/caching
- UI components: LocalTranscribeButton, DownloadProgressBanner, RecordingTimer, PrivacyBadge
- Production error handling: browser gating, mic denial, download failure, empty transcription, silence detection
- NestJS backend extension integrated into existing extension system
- Bilingual support (de/en) with complete i18n and accessibility labels

### What Worked
- **Vertical slice approach**: Each phase delivered a complete, testable increment. Phase 1 (infrastructure) caught COOP/COEP issues early
- **Milestone audit before close**: Identified all 12 tech debt items and 21 stale requirement checkboxes that would have been carried silently
- **Code review as final phase**: Phase 6 code review found and fixed 6 real bugs (null dereferences, promise hangs, division by zero) that tests missed
- **Extension system pattern**: Following the existing backend extension pattern made registration and admin UI integration straightforward
- **Two-day timeline**: 6 phases, 12 plans, 856 LOC production code shipped in 2 days with full test coverage

### What Was Inefficient
- **Documentation tracking**: REQUIREMENTS.md checkboxes and traceability table fell out of sync across phases 2-4. 21 checkboxes showed [ ] for satisfied requirements. The tracking overhead per commit is low but was consistently skipped
- **SUMMARY frontmatter inconsistency**: Phase 4 and 5 SUMMARYs missing `requirements_completed` field, Phase 3 SUMMARY omitted I18N-01. Frontmatter discipline dropped after Phase 2
- **ROADMAP progress table stale**: Phase 2 and 3 progress table showed "0/2 Planned" when both were complete. Table was not updated during phase transitions

### Patterns Established
- **Render-phase state derivation**: Track previous prop in state, compute derived state synchronously during render. Satisfies both react-hooks/set-state-in-effect and react-hooks/refs ESLint rules
- **Two-layer silence detection**: RMS energy pre-check before inference + hallucination post-filter after inference. Prevents wasted compute and catches known Whisper outputs
- **Worker singleton pipeline**: Single Transformers.js pipeline instance held in Worker, with promise-based instance caching and reset-on-failure for retry capability

### Key Lessons
1. **Run code review before milestone close, not after**: Phase 6 code review found 6 bugs in code that had passed all 176 frontend tests. Static analysis and human review catch different classes of bugs than test suites
2. **Automate requirement tracking or skip it**: Manual checkbox tracking across 34 requirements and 6 phases is high-friction and consistently went stale. Either automate via SUMMARY frontmatter extraction or accept verification-based tracking only
3. **COOP/COEP credentialless is the safe default**: Using credentialless instead of require-corp avoided breaking existing cross-origin resources while still enabling SharedArrayBuffer

### Cost Observations
- Model mix: Primarily opus for planning/execution, sonnet for research/review
- Notable: 2-day end-to-end milestone is fast for 856 LOC with full test coverage. Phase parallelization (waves) kept execution tight

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 6 | 12 | Initial milestone. Established phase/plan/wave pattern |

### Cumulative Quality

| Milestone | Frontend Tests | Backend Tests | E2E Tests | Production LOC |
|-----------|---------------|---------------|-----------|----------------|
| v1.0 | 176 | 225 | 30/33 | 856 |

### Top Lessons (Verified Across Milestones)

1. Code review catches bugs that test suites miss -- run before milestone close
2. Documentation tracking needs automation -- manual checkbox tracking goes stale consistently
