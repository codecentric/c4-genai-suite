# Phase 6: Address Tech Debt: Documentation and Code Cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-08
**Phase:** 06-tech-debt-documentation-code-cleanup
**Areas discussed:** Documentation depth, Planning reference cleanup, Model name discrepancy, Hook structure

---

## Documentation Depth

### Question 1: Documentation level

| Option | Description | Selected |
|--------|-------------|----------|
| JSDoc on exports only | Add brief JSDoc to exported types, hook params, and component props. Nothing on internals. | |
| JSDoc + module headers | JSDoc on exports PLUS 1-2 line module-level comment at top of each file. | |
| You decide | Claude picks the level that matches existing codebase patterns best. | ✓ |

**User's choice:** You decide
**Notes:** Claude will follow codebase conventions (minimal JSDoc on public interfaces).

### Question 2: Feature README

| Option | Description | Selected |
|--------|-------------|----------|
| No feature README | Code should be self-documenting. Extension system is well-established. | ✓ |
| Brief architecture doc | Short markdown covering Worker→Hook→Component data flow. | |
| You decide | Claude decides based on how self-explanatory the code already is. | |

**User's choice:** No feature README
**Notes:** None.

---

## Planning Reference Cleanup

### Question 1: Decision references in comments

| Option | Description | Selected |
|--------|-------------|----------|
| Remove references, keep intent | Strip (D-04), (AUDIO-03) suffixes but keep explanatory text. | ✓ |
| Remove all planning comments | Strip both references AND explanatory text. | |
| Keep as-is | Leave all comments including decision references. | |

**User's choice:** Remove references, keep intent
**Notes:** Planning refs belong in commit history, not code. Explanatory text stays.

---

## Model Name Discrepancy

### Question 1: whisper-base vs whisper-small

| Option | Description | Selected |
|--------|-------------|----------|
| Change code to whisper-base | Align code to original spec. Switch to whisper-base (~140MB). | |
| Update docs to whisper-small | Code is correct. Update PROJECT.md and REQUIREMENTS.md to reflect whisper-small q8 (~240MB). | ✓ |
| Defer model decision | Mark as known discrepancy, don't change model in this phase. | |

**User's choice:** Update docs to whisper-small
**Notes:** Code ships whisper-small q8. Documentation must match reality.

---

## Hook Structure

### Question 1: Sub-hook extraction

| Option | Description | Selected |
|--------|-------------|----------|
| Extract sub-hooks | Split into useWhisperWorker + useMediaRecording + useLocalTranscribe orchestrator. | |
| Keep as one hook | Hook is complex but cohesive. Splitting may just move complexity around. | |
| You decide | Claude assesses whether splitting genuinely improves clarity. | ✓ |

**User's choice:** You decide
**Notes:** Claude will assess based on coupling analysis.

### Question 2: Ref-sync effects

| Option | Description | Selected |
|--------|-------------|----------|
| Consolidate to one effect | Merge 4 ref-sync effects into single useEffect. | |
| Leave separate | Each effect is clear about what it syncs. Idiomatic React. | |
| You decide | Claude picks the approach matching existing codebase patterns. | ✓ |

**User's choice:** You decide
**Notes:** Claude will follow codebase conventions.

---

## Claude's Discretion

- Documentation level — match existing codebase JSDoc patterns (D-01)
- Hook refactoring — assess whether extraction genuinely improves clarity (D-05)
- Ref-sync effect consolidation — follow existing codebase patterns (D-06)
- Dead code identification and removal
- Pattern consistency enforcement

## Deferred Ideas

None — discussion stayed within phase scope
