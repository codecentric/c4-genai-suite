# Concerns

> Mapped: 2026-05-07

## Tech Debt

### TD-1: Tool errors not surfaced to UI
- **Location:** `backend/src/domain/chat/middlewares/execute-middleware.ts:104`
- **Impact:** Medium — tool failures silently logged, user sees no indication
- **TODO:** `// TODO: maybe add a tool_error event type and indicate errors in the ui`

### TD-2: Vision tool missing error handling for unsupported models
- **Location:** `backend/src/extensions/tools/files-vision.ts:145`
- **Impact:** Medium — unsupported model+vision combinations fail silently
- **TODO:** `//TODO: for unsupported models there should be error handling`

### TD-3: Hardcoded empty userGroup in rating tracking
- **Location:** `backend/src/domain/chat/use-cases/rate-message.ts:59`
- **Impact:** Low — ratings not attributed to user groups, analytics gap
- **TODO:** `userGroup: '', //TODO: fixme`

### TD-4: Message history stored as JSON in string column
- **Location:** `backend/src/domain/chat/middlewares/get-history-middleware.ts:228`
- **Impact:** Low — suboptimal storage, potential migration complexity
- **TODO:** `// TODO: maybe we should not save this json structure but migrate to a string column`

### TD-5: Settings validation lacks whitelisting
- **Location:** `backend/src/controllers/settings/settings.e2e.spec.ts:61`
- **Impact:** Medium — settings endpoint may accept unintended properties
- **TODO:** `//TODO: only allow whitelisted properties`

### TD-6: Missing indexName in bucket testing
- **Location:** `backend/src/domain/files/use-cases/test-bucket.ts:21`
- **Impact:** Low — bucket connection test incomplete
- **TODO:** `//TODO add indexName here`

### TD-7: Monolithic DTO files
- **Location:** `backend/src/controllers/extensions/dtos/index.ts` (1048 lines), `backend/src/controllers/conversations/dtos/index.ts` (643 lines)
- **Impact:** Low — large barrel files reduce maintainability

### TD-8: Large generated API client
- **Location:** `frontend/src/api/generated/` (12,878 lines total)
- **Impact:** Low — auto-generated, but contributes to bundle size and IDE slowness

## Known Bugs / Race Conditions

### BUG-1: File upload quota race condition
- **Location:** `backend/src/domain/files/use-cases/upload-file.ts:156-166`
- **Impact:** Medium — parallel uploads can exceed per-user quota before the check catches it
- **Detail:** Quota check reads current count, then uploads. Concurrent uploads can both pass the check before either completes.

### BUG-2: LibreOffice conversion race
- **Location:** `services/reis/rei_s/services/formats/utils.py:104`
- **Impact:** Medium — multiple simultaneous LibreOffice instances may conflict
- **FIXME:** `# FIXME: this might fail due to a race (?) when starting multiple LibreOffice instances`
- **Detail:** Each conversion starts a subprocess; LibreOffice uses a per-user lock that can fail with concurrent instances.

## Security Considerations

### SEC-1: TLS certificate validation disabled for file client
- **Location:** `backend/src/domain/files/use-cases/utils.ts:86`
- **Impact:** High — `rejectUnauthorized: false` disables certificate verification for internal file service connections
- **Detail:** Applied to undici fetch calls to REI-S. SSRF comment indicates intentional scoping, but cert validation bypass weakens transport security.

### SEC-2: Long-lived HTTP connections (3-hour timeout)
- **Location:** `backend/src/domain/files/use-cases/utils.ts:75`
- **Impact:** Medium — 3-hour connection timeout for file operations could be exploited for resource exhaustion
- **FIXME:** `// FIXME we need a better concept than long lasting connections`

### SEC-3: Session secret handling
- **Location:** `backend/src/config/cookies.ts:10-16`
- **Impact:** Low (handled correctly) — production requires `SESSION_SECRET` env var, throws if missing. Development uses random secret. Docker compose uses `random` placeholder.

### SEC-4: Shell command execution in document conversion
- **Location:** `services/reis/rei_s/services/formats/utils.py:110`
- **Impact:** Medium — subprocess.run for LibreOffice conversion. Command is constructed from internal paths (not user input), but file names flow through the system.

## Performance Concerns

### PERF-1: Message history loaded entirely into memory
- **Location:** `backend/src/domain/chat/middlewares/get-history-middleware.ts`
- **Impact:** Medium — full conversation history retrieved for each message; no pagination or windowing for very long conversations

### PERF-2: All extensions instantiated at server startup
- **Location:** `backend/src/domain/extensions/`
- **Impact:** Low — extension registry loads all providers at boot. Not an issue at current scale but limits lazy-loading patterns.

### PERF-3: File quota checking is O(n) per upload
- **Location:** `backend/src/domain/files/use-cases/upload-file.ts:156-166`
- **Impact:** Low — counts all user files per upload. Performance impact grows with user file count.

## Fragile Areas

### FRAG-1: Chat middleware chain
- **Location:** `backend/src/domain/chat/middlewares/`
- **Impact:** High — 14+ middlewares with implicit ordering dependencies. Changes to one middleware can break downstream processing.

### FRAG-2: Extension import test
- **Location:** `backend/src/domain/extensions/use-cases/import-configuration.spec.ts` (991 lines)
- **Impact:** Medium — very large test file testing extension import/export, changes to extension schema easily break it.

### FRAG-3: MCP tools extension
- **Location:** `backend/src/extensions/tools/mcp-tools.ts` (570 lines)
- **Impact:** Medium — complex MCP protocol integration in a single file, handles tool discovery, execution, and error recovery.

## Scaling Limits

- **Conversation history:** Full history loaded per message (no windowing)
- **File quota:** Per-upload O(n) check without DB-level constraints
- **Extension loading:** All extensions instantiated at boot regardless of usage

## Dependencies at Risk

- **LibreOffice subprocess:** External binary dependency for document conversion, not managed by package manager, version-sensitive
- **Generated API clients:** Frontend and backend rely on OpenAPI-generated code; spec drift causes build failures

## Test Coverage Gaps

- **Tool error propagation:** No tests verify tool errors surface correctly to the UI
- **Vision tool model compatibility:** No tests for unsupported model+vision combinations
- **File upload concurrency:** No tests for quota race conditions under parallel uploads
- **LibreOffice concurrent conversion:** No tests for multi-instance race condition

## Format Conversion Risk

`services/reis/rei_s/services/formats/` has 18 format providers. Several depend on external tools (LibreOffice, ffmpeg for video/voice transcription). Failure modes for these are partially handled — the `utils.py` FIXME indicates known gaps.
