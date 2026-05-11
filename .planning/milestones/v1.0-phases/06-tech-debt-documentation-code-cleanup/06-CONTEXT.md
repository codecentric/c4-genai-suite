# Phase 6: Address Tech Debt: Documentation and Code Cleanup - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase improves code quality and maintainability of the local transcription feature (8 files, ~806 lines). It covers: adding appropriate JSDoc/module documentation, cleaning up planning-reference comments, resolving the whisper-base vs whisper-small documentation discrepancy, and assessing hook structure for potential refactoring. No new features, no behavioral changes.

</domain>

<decisions>
## Implementation Decisions

### Documentation Style
- **D-01:** Documentation level is **Claude's discretion**, following existing codebase patterns. The project convention is minimal JSDoc (only on public interfaces per Extension interface pattern), no over-commenting. Apply JSDoc to exported types (`LocalTranscribeState`, `DownloadProgress`, `UseLocalTranscribeProps`) and component props interfaces. No feature-level README — code should be self-documenting.
- **D-02:** No standalone feature README or architecture document. The code should speak for itself through naming and structure.

### Planning Reference Cleanup
- **D-03:** **Remove decision references (D-04, D-08, AUDIO-03), keep the explanatory text.** Strip planning-phase suffixes like `(D-04)`, `(D-08)`, `(AUDIO-03)` from comments but preserve the intent-explaining text. E.g., `// auto-start recording after download` stays, `(D-04)` goes. Planning refs belong in commit history, not code.

### Model Name Discrepancy
- **D-04:** **Update PROJECT.md and REQUIREMENTS.md to reflect the actual model: whisper-small q8 (~240MB).** The code uses `onnx-community/whisper-small` with `dtype: 'q8'`, but docs still say whisper-base (~140MB). Align all documentation to match the shipped code. Document the rationale for the change.

### Hook Structure
- **D-05:** Whether to extract sub-hooks from `useLocalTranscribe` (388 lines, 10 refs) is **Claude's discretion.** Assess whether splitting genuinely improves clarity or just moves complexity around. The hook is tightly coupled — Worker triggers recording, recording feeds Worker — so splitting may not simplify anything.
- **D-06:** Whether to consolidate the 4 ref-sync `useEffect` blocks into one or leave them separate is **Claude's discretion.** Follow whichever approach best matches existing codebase patterns.

### Claude's Discretion
- Documentation level matching existing codebase patterns (D-01)
- Hook refactoring decision — extract sub-hooks or keep as one unit (D-05)
- Ref-sync effect consolidation (D-06)
- Identification and removal of any dead code, unused imports, or redundant abstractions discovered during cleanup
- Ensuring consistent patterns across all local transcription modules

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Local Transcription Source Files (modify)
- `frontend/src/hooks/useLocalTranscribe.ts` — Main hook (388 lines). Primary cleanup target for comments and potential refactoring.
- `frontend/src/workers/whisper.worker.ts` — Web Worker (177 lines). Contains model reference (`onnx-community/whisper-small`), silence detection, hallucination filter.
- `frontend/src/pages/chat/conversation/LocalTranscribeButton.tsx` — Button component (92 lines).
- `frontend/src/pages/chat/conversation/DownloadProgressBanner.tsx` — Download progress UI (65 lines).
- `frontend/src/pages/chat/conversation/PrivacyBadge.tsx` — Privacy indicator (18 lines).
- `frontend/src/pages/chat/conversation/RecordingTimer.tsx` — Recording timer (28 lines).
- `frontend/src/lib/audio-utils.ts` — Audio resampling utility (21 lines).
- `backend/src/extensions/other/local-transcribe.ts` — Backend extension registration (38 lines).

### Integration Points (read-only, check for consistency)
- `frontend/src/pages/chat/conversation/ChatInput.tsx` §188-349 — Integration point wiring all local transcription components.

### Project Documentation (modify — model name fix)
- `.planning/PROJECT.md` — Says "whisper-base (~140MB)" throughout. Must be updated to "whisper-small q8 (~240MB)".
- `.planning/REQUIREMENTS.md` — References "whisper-base (~140MB)". Must be updated.

### Codebase Conventions (read-only)
- `.planning/codebase/CONVENTIONS.md` — Coding conventions, JSDoc guidelines, comment policy. Reference for documentation decisions.

### Test Files (read-only, verify no breakage)
- `frontend/src/hooks/useLocalTranscribe.ui-unit.spec.ts`
- `frontend/src/workers/whisper.worker.ui-unit.spec.ts`
- `frontend/src/pages/chat/conversation/LocalTranscribeButton.ui-unit.spec.tsx`
- `frontend/src/pages/chat/conversation/DownloadProgressBanner.ui-unit.spec.tsx`
- `frontend/src/pages/chat/conversation/PrivacyBadge.ui-unit.spec.tsx`
- `frontend/src/pages/chat/conversation/RecordingTimer.ui-unit.spec.tsx`
- `backend/src/extensions/other/local-transcribe.spec.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- ESLint with `no-warning-comments: error` — enforces no TODOs/FIXMEs, already clean.
- `knip.json` in frontend — dead code detection tool already configured.
- Prettier formatting already enforced via lint-staged pre-commit hooks.

### Established Patterns
- JSDoc limited to public API interfaces (Extension interface pattern in `src/domain/extensions/interfaces.ts`).
- Comments explain WHY, not WHAT. Non-obvious error handling and workarounds documented.
- Separate ref-sync effects are idiomatic in the codebase (each effect is clear about its purpose).
- Components follow Mantine + Tailwind composition pattern consistently.

### Integration Points
- ChatInput.tsx lines 188-349 wire all local transcription components together. Any interface changes during refactoring must maintain compatibility.
- Test files import types from the source files — exported type changes need test updates.

</code_context>

<specifics>
## Specific Ideas

- Decision-reference comments follow a clear pattern: `// explanatory text (D-XX)` or `// explanatory text (AUDIO-XX)`. A systematic find-and-replace can strip the parenthetical suffixes.
- PROJECT.md model references appear in: "What This Is", Requirements, Constraints, and Key Decisions sections — all need updating from whisper-base to whisper-small q8.
- The hook's 10 refs serve a specific purpose (stable callback identity for Worker message handler). Before refactoring, verify that extraction wouldn't just move refs between hooks without reducing complexity.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 6-Address Tech Debt: Documentation and Code Cleanup*
*Context gathered: 2026-05-08*
