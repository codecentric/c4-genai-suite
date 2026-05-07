# Phase 1: Infrastructure & Backend Extension - Research

**Researched:** 2026-05-07
**Domain:** Vite build configuration, COOP/COEP cross-origin isolation, NestJS extension system
**Confidence:** HIGH

## Summary

Phase 1 delivers three capabilities: (1) Vite configuration changes to support Transformers.js/ONNX Runtime bundling, (2) COOP/COEP headers on the Vite dev server for SharedArrayBuffer, and (3) a new `transcribe-local` backend extension registered in the existing NestJS extension system with a `defaultLanguage` config field.

The codebase has a well-established extension pattern. The existing `speech-to-text.ts` and `azure-transcribe.ts` extensions in `backend/src/extensions/other/` serve as direct templates. The new extension follows the same marker pattern (empty middlewares, group `speech-to-text`, type `other`) and inherits mutual exclusivity automatically through the `group` field. Vite configuration changes are additive -- `optimizeDeps.exclude`, `server.headers`, and `worker.format` settings can be added to the existing `vite.config.ts` without disrupting current behavior.

**Primary recommendation:** Follow the azure-transcribe extension as the primary template for the new extension (it demonstrates config fields with `format: 'select'`), add three additive blocks to `vite.config.ts` (optimizeDeps, headers, worker), and validate with existing E2E tests.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Extension gets a `defaultLanguage` config field as Select-Dropdown with options `de` and `en`. Admin selects per assistant, user can override in frontend dropdown.
- **D-02:** `defaultLanguage` is `required` with default value `de`. No indeterminate state possible.
- **D-03:** Only `de` and `en` in v1 -- no additional languages to prepare.
- **D-04:** COOP/COEP headers are set ONLY in Vite Dev Server in Phase 1 (not production). Production headers come separately.
- **D-05:** Regression check via existing E2E tests (Playwright). No additional manual checklists or feature flags.
- **D-06:** If `credentialless` COEP policy causes problems with the backend proxy (`/api-proxy` -> localhost:3000): adjust proxy (add CORP header), keep `credentialless`. No switch to `require-corp`.
- **D-07:** Logo/Icon: Microphone with lock/shield symbol -- communicates privacy aspect visually.
- **D-08:** Title: "Lokale Spracherkennung" (de) / "Local Speech Recognition" (en). Description emphasizes that audio doesn't leave the browser.
- **D-09:** Sorting in Admin-UI: after cloud options (Speech-to-Text, Transcribe Azure). Existing order remains unchanged.

### Claude's Discretion
None -- all decisions made by user.

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | Vite config supports ONNX Runtime and Web Worker bundling (optimizeDeps.exclude, assetsInclude) | Verified Vite 8 `optimizeDeps.exclude` and `worker.format` patterns; `@huggingface/transformers` must be excluded from pre-bundling to avoid WASM parse failures |
| INFRA-02 | COOP/COEP headers configured in Vite Dev Server for SharedArrayBuffer (credentialless) | Verified `server.headers` in Vite 8 works for setting COOP/COEP; `credentialless` avoids HMR WebSocket blocking that `require-corp` causes |
| INFRA-03 | @huggingface/transformers installed as npm dependency | Verified v4.2.0 on npm registry; depends on onnxruntime-web 1.26.0-dev |
| INFRA-04 | Existing app functionality not impacted after header changes (regression) | Existing Playwright E2E suite (3 browsers) serves as regression gate; `credentialless` policy is compatible with same-origin proxy |
| EXT-01 | Backend extension 'transcribe-local' registered in extension system (group: speech-to-text, type: other) | Verified `@Extension()` decorator + `ExtensionSpec` interface pattern; `group: 'speech-to-text'` auto-enforces mutual exclusivity |
| EXT-02 | Extension configurable per assistant via Admin-UI (activate/deactivate) | Verified: all extensions with `@Extension()` decorator are auto-discovered by `ExplorerService` and appear in admin UI |
| EXT-03 | Extension mutual exclusive with speech-to-text/transcribe-azure (same group) | Verified: `group` field in `ExtensionSpec` interface (line 133 interfaces.ts) enforces pairwise incompatibility |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Vite build config (ONNX/Worker) | Frontend Server (Dev) | -- | Vite config is dev-time build tooling |
| COOP/COEP headers | Frontend Server (Dev) | -- | Dev server headers; production is separate concern (D-04) |
| @huggingface/transformers install | Frontend (npm) | -- | Client-side dependency for browser inference |
| Extension registration | API / Backend | -- | NestJS extension system with auto-discovery |
| Extension config (defaultLanguage) | API / Backend | -- | Backend owns extension spec schema |
| Admin-UI extension display | Frontend | API / Backend | Frontend renders what backend provides via API |
| Mutual exclusivity | API / Backend | -- | Enforced by backend extension `group` field |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @huggingface/transformers | 4.2.0 | Transformers.js for browser ML inference | [VERIFIED: npm registry] Official HuggingFace package, successor to @xenova/transformers |
| vite | 8.0.8 | Build tool (already installed) | [VERIFIED: frontend/package.json] Project standard |
| @nestjs/common | (existing) | Backend framework | [VERIFIED: codebase] Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| onnxruntime-web | 1.26.0-dev (transitive) | WASM/WebGPU inference runtime | [VERIFIED: npm view] Bundled as dependency of @huggingface/transformers, not installed separately |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @huggingface/transformers | @xenova/transformers (v2) | v2 is deprecated; v4 is the official successor with WebGPU support |
| COEP: credentialless | COEP: require-corp | require-corp breaks HMR WebSocket polling and requires CORP headers on all cross-origin resources |

**Installation:**
```bash
cd frontend && npm install @huggingface/transformers@4.2.0
```

**Version verification:**
- `@huggingface/transformers`: 4.2.0 [VERIFIED: `npm view @huggingface/transformers version` on 2026-05-07]
- `vite`: 8.0.8 [VERIFIED: frontend/package.json devDependencies]
- `onnxruntime-web`: 1.26.0-dev.20260416-b7804b056c (transitive via transformers) [VERIFIED: `npm view @huggingface/transformers@4.2.0 dependencies`]

## Architecture Patterns

### System Architecture Diagram

```
                    Phase 1 Scope
                    =============

  [Admin UI] ──GET /extensions──> [NestJS Backend]
       |                              |
       |                    ExplorerService.getExtensions()
       |                              |
       |                    Scans @Extension() providers
       |                              |
       |                    Returns ExtensionSpec[]
       |                    (incl. transcribe-local)
       |                              |
       v                              v
  Renders extension cards        group: 'speech-to-text'
  with config form               enforces mutual exclusivity
  (defaultLanguage select)

  ────────────────────────────────────────────

  [Vite Dev Server :5173]
       |
       |── Sets COOP/COEP headers on all responses
       |   (Cross-Origin-Opener-Policy: same-origin)
       |   (Cross-Origin-Embedder-Policy: credentialless)
       |
       |── Proxies /api-proxy/* -> localhost:3000
       |   (same-origin from browser perspective)
       |
       |── Pre-bundling excludes @huggingface/transformers
       |   (WASM files served as-is)
       |
       v
  [Browser: crossOriginIsolated = true]
       |
       v
  SharedArrayBuffer available
  (needed by onnxruntime-web in Phase 2)
```

### Recommended Project Structure
```
backend/src/extensions/other/
  local-transcribe.ts          # New extension file
  local-transcribe.spec.ts     # Unit test

backend/src/localization/i18n/
  de/texts.json                # Add localTranscribe key
  en/texts.json                # Add localTranscribe key

frontend/
  vite.config.ts               # Modified (3 additions)
  package.json                 # Add @huggingface/transformers
```

### Pattern 1: Marker Extension (No Middleware)
**What:** Backend extension that acts as a configuration marker -- it has no chat middlewares but is recognized by the frontend to enable UI features.
**When to use:** When the extension's logic lives entirely in the frontend (like speech recognition).
**Example:**
```typescript
// Source: backend/src/extensions/other/speech-to-text.ts (existing pattern)
@Extension()
export class LocalTranscribeExtension implements Extension {
  constructor(private readonly i18n: I18nService) {}

  get spec(): ExtensionSpec {
    return {
      name: 'transcribe-local',
      group: 'speech-to-text',
      title: this.i18n.t('texts.extensions.localTranscribe.title'),
      logo: '...SVG...',
      description: this.i18n.t('texts.extensions.localTranscribe.description'),
      type: 'other',
      arguments: {
        defaultLanguage: {
          type: 'string',
          title: this.i18n.t('texts.extensions.localTranscribe.defaultLanguage'),
          required: true,
          format: 'select',
          examples: ['de', 'en'],
          default: 'de',
        },
      },
    };
  }

  getMiddlewares(): Promise<ChatMiddleware[]> {
    return Promise.resolve([]);
  }
}
```

### Pattern 2: Vite Dev Server Headers
**What:** Setting custom HTTP headers on all Vite dev server responses.
**When to use:** When browser features require cross-origin isolation (SharedArrayBuffer, high-resolution timers).
**Example:**
```typescript
// Source: Vite docs server-options.md [VERIFIED: Context7]
// Addition to existing vite.config.ts
export default defineConfig({
  // ... existing config ...
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
    // existing proxy config stays unchanged
    proxy: {
      '/api-proxy': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api-proxy/, ''),
      },
    },
  },
});
```

### Pattern 3: Extension Config with Select Dropdown
**What:** Using `format: 'select'` with `examples` array for dropdown config fields in the Admin UI.
**When to use:** When an extension needs a fixed set of options selectable by the admin.
**Example:**
```typescript
// Source: backend/src/extensions/other/azure-transcribe.ts (existing pattern)
arguments: {
  defaultLanguage: {
    type: 'string',
    title: this.i18n.t('texts.extensions.localTranscribe.defaultLanguage'),
    required: true,
    format: 'select',
    examples: ['de', 'en'],
    default: 'de',
  },
},
```

### Anti-Patterns to Avoid
- **Do NOT add onnxruntime-web as a direct dependency:** It is a transitive dependency of @huggingface/transformers. Installing it separately can cause version conflicts. [VERIFIED: npm view shows it as a dependency of transformers 4.2.0]
- **Do NOT use `COEP: require-corp`:** It breaks Vite HMR WebSocket polling fallback and requires CORP headers on all cross-origin resources. Use `credentialless` instead (D-06). [CITED: github.com/vitejs/vite/issues/16536]
- **Do NOT modify ExplorerService sorting:** Extensions are sorted alphabetically by title. Changing this would affect all extensions. See Pitfall 2 for the ordering concern.
- **Do NOT include @huggingface/transformers in optimizeDeps:** Pre-bundling fails on WASM imports. It must be excluded. [CITED: github.com/vitejs/vite/discussions/15962]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Extension registration | Custom module registration | `@Extension()` decorator + ExtensionLibraryModule providers array | Auto-discovered by ExplorerService via NestJS DI + Reflect metadata |
| Mutual exclusivity logic | Custom group-checking code | `group: 'speech-to-text'` in ExtensionSpec | Built into the extension system, enforced at configuration level |
| Admin UI form rendering | Custom config form for defaultLanguage | `arguments` schema in ExtensionSpec with `format: 'select'` | Admin UI auto-generates forms from the arguments schema |
| i18n translation lookup | Hardcoded strings | `this.i18n.t('texts.extensions...')` + JSON translation files | Existing nestjs-i18n integration handles language resolution |
| COOP/COEP header middleware | Custom Vite plugin with configureServer | `server.headers` config option | Built into Vite 8, no plugin needed [VERIFIED: Vite docs] |

**Key insight:** The existing extension system handles registration, admin UI rendering, mutual exclusivity, and i18n automatically. The new extension only needs to provide a spec and be registered in the providers array.

## Common Pitfalls

### Pitfall 1: WASM Pre-Bundling Failure
**What goes wrong:** Vite's dependency optimizer tries to pre-bundle `@huggingface/transformers` and fails on WASM imports, producing "expected magic word" errors.
**Why it happens:** Vite's esbuild-based pre-bundling cannot parse `.wasm` binary files imported by onnxruntime-web.
**How to avoid:** Add `@huggingface/transformers` to `optimizeDeps.exclude` in vite.config.ts.
**Warning signs:** Build errors mentioning "magic word 00 61 73 6d" or "Failed to parse" during dev server startup.

### Pitfall 2: Extension Sort Order vs. User Expectation (D-09)
**What goes wrong:** User expects the new extension to appear AFTER the cloud options in admin UI, but alphabetical sorting by title places it BEFORE them.
**Why it happens:** `ExplorerService` sorts extensions by `title.localeCompare()`. "Local Speech Recognition" (L) sorts before "Speech To Text" (S) and "Transcription: Azure OpenAI" (T). Same in German: "Lokale Spracherkennung" (L) < "Spracheingabe" (S).
**How to avoid:** Accept that alphabetical ordering places the local extension first in the list. The user's D-09 decision may conflict with the system's sort behavior. Document this for the planner -- either the title needs adjustment (e.g., prefix with a character that sorts after T) or the sort order concern needs user re-confirmation.
**Warning signs:** Extension appears at wrong position in admin UI extension list.

### Pitfall 3: HMR Connection Failure with require-corp
**What goes wrong:** Using `COEP: require-corp` breaks Vite's HMR WebSocket polling fallback. When the dev server restarts, the page cannot reconnect and requires manual reload.
**Why it happens:** The HMR endpoint doesn't include CORP headers, and `require-corp` blocks resources without them.
**How to avoid:** Use `COEP: credentialless` as decided (D-06). This avoids CORP header requirements on cross-origin resources.
**Warning signs:** "Cross-Origin-Resource-Policy" blocking messages in browser console, HMR not reconnecting after server restart.

### Pitfall 4: Forgetting to Register Extension in ExtensionLibraryModule
**What goes wrong:** Extension file exists but doesn't appear in admin UI.
**Why it happens:** The `@Extension()` decorator only adds metadata. The class must also be listed in the `providers` array of `ExtensionLibraryModule.register()` in `backend/src/extensions/module.ts`.
**How to avoid:** Add both: (1) import statement and (2) provider entry in the providers array.
**Warning signs:** Extension works in unit tests but doesn't show up in running app.

### Pitfall 5: Missing i18n Keys Cause Raw Key Display
**What goes wrong:** Extension title/description shows raw i18n key strings like `texts.extensions.localTranscribe.title` instead of translated text.
**Why it happens:** Backend i18n JSON files (de/texts.json, en/texts.json) don't have the new keys.
**How to avoid:** Add i18n entries to both `backend/src/localization/i18n/de/texts.json` and `backend/src/localization/i18n/en/texts.json` before testing.
**Warning signs:** Extension card in admin UI shows dot-separated key path instead of human-readable text.

### Pitfall 6: credentialless Not Supported in Safari
**What goes wrong:** `SharedArrayBuffer` is not available when developing in Safari.
**Why it happens:** Safari does not support `COEP: credentialless` (no planned support as of 2026). [VERIFIED: caniuse.com]
**How to avoid:** Per D-04, Phase 1 only targets Vite Dev Server. Development with Chrome or Firefox is sufficient. Document Safari limitation for production phase.
**Warning signs:** `crossOriginIsolated` returns `false` in Safari console.

## Code Examples

Verified patterns from official sources:

### Complete Extension File (local-transcribe.ts)
```typescript
// Source: Pattern derived from backend/src/extensions/other/azure-transcribe.ts [VERIFIED: codebase]
import { ChatMiddleware } from '../../domain/chat';
import { Extension, ExtensionConfiguration, ExtensionSpec } from '../../domain/extensions';
import { I18nService } from '../../localization/i18n.service';

@Extension()
export class LocalTranscribeExtension implements Extension<LocalTranscribeConfiguration> {
  constructor(private readonly i18n: I18nService) {}

  get spec(): ExtensionSpec {
    return {
      name: 'transcribe-local',
      group: 'speech-to-text',
      title: this.i18n.t('texts.extensions.localTranscribe.title'),
      logo: '...microphone-with-shield SVG...',
      description: this.i18n.t('texts.extensions.localTranscribe.description'),
      type: 'other',
      arguments: {
        defaultLanguage: {
          type: 'string',
          title: this.i18n.t('texts.extensions.localTranscribe.defaultLanguage'),
          required: true,
          format: 'select',
          examples: ['de', 'en'],
          default: 'de',
        },
      },
    };
  }

  getMiddlewares(): Promise<ChatMiddleware[]> {
    return Promise.resolve([]);
  }
}

export type LocalTranscribeConfiguration = ExtensionConfiguration & {
  defaultLanguage: 'de' | 'en';
};
```

### Unit Test Pattern (local-transcribe.spec.ts)
```typescript
// Source: Pattern derived from backend/src/extensions/other/azure-transcribe.spec.ts [VERIFIED: codebase]
import { I18nService } from '../../localization/i18n.service';
import { LocalTranscribeExtension } from './local-transcribe';

describe('LocalTranscribeExtension', () => {
  let extension: LocalTranscribeExtension;

  const i18n = {
    t: (val: string) => val,
  } as unknown as I18nService;

  beforeEach(() => {
    extension = new LocalTranscribeExtension(i18n);
  });

  describe('spec', () => {
    it('should have correct name', () => {
      expect(extension.spec.name).toBe('transcribe-local');
    });

    it('should have group set to speech-to-text', () => {
      expect(extension.spec.group).toBe('speech-to-text');
    });

    it('should have type set to other', () => {
      expect(extension.spec.type).toBe('other');
    });

    it('should have defaultLanguage as required select with de/en', () => {
      const arg = extension.spec.arguments.defaultLanguage;
      expect(arg).toMatchObject({
        type: 'string',
        required: true,
        format: 'select',
        examples: ['de', 'en'],
        default: 'de',
      });
    });

    it('should return empty middlewares', async () => {
      const middlewares = await extension.getMiddlewares();
      expect(middlewares).toEqual([]);
    });
  });
});
```

### Vite Config Additions
```typescript
// Source: Vite docs + Transformers.js docs [VERIFIED: Context7, caniuse.com]
// Additions to frontend/vite.config.ts (merge into existing defineConfig)
export default defineConfig({
  // ... existing resolve, test, plugins ...

  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  worker: {
    format: 'es',
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
    // existing proxy stays as-is
    proxy: { /* ... existing ... */ },
  },
});
```

### Backend i18n Entries
```json
// Source: backend/src/localization/i18n/en/texts.json (pattern from existing entries) [VERIFIED: codebase]
{
  "localTranscribe": {
    "title": "Local Speech Recognition",
    "description": "Transcribe audio locally in the browser - audio data never leaves your device",
    "defaultLanguage": "Default Language"
  }
}
```

```json
// Source: backend/src/localization/i18n/de/texts.json [VERIFIED: codebase]
{
  "localTranscribe": {
    "title": "Lokale Spracherkennung",
    "description": "Audio wird lokal im Browser transkribiert - Audiodaten verlassen Ihr Geraet nicht",
    "defaultLanguage": "Standardsprache"
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @xenova/transformers (v2) | @huggingface/transformers (v3/v4) | 2024 | Package name changed; v4 adds WebGPU support, onnxruntime-web 1.26+ |
| COEP: require-corp only | COEP: credentialless available | Chrome 96 (2021), Firefox 119 (2023) | Easier cross-origin isolation without CORP headers on all resources |
| Vite plugin for COOP/COEP | Built-in server.headers | Vite 5.4+ | No custom plugin needed for dev server headers |
| Manual extension wiring | @Extension() decorator auto-discovery | Existing in codebase | ExplorerService scans NestJS DI container for decorated classes |

**Deprecated/outdated:**
- `@xenova/transformers`: Deprecated in favor of `@huggingface/transformers`. Do not use.
- `vite-plugin-cross-origin-isolation`: Unnecessary since Vite supports `server.headers` natively.

## Project Constraints (from CLAUDE.md)

- **Commit messages:** `<type>(<scope>): <subject>` format. Types: feat, fix, refactor, test, docs, chore. Scopes: frontend, backend.
- **Backend tests:** Jest with `NODE_OPTIONS="$NODE_OPTIONS --experimental-vm-modules"` and `--runInBand --forceExit`
- **Frontend tests:** Vitest with pattern `src/**/*.ui-unit.spec.*` or `src/**/*.integration.spec.*`
- **Linting:** ESLint + Prettier for both frontend and backend; run before committing
- **Pre-commit hooks:** lint-staged active
- **E2E tests:** Playwright with Chromium, Firefox, WebKit; run via `node scripts/run-tests.js`
- **Extension example:** See `backend/src/extensions/examples/always-42.ts` for minimal pattern
- **i18n:** Backend uses `nestjs-i18n` with JSON files in `backend/src/localization/i18n/{lang}/texts.json`; Frontend uses `i18next` with files in `frontend/src/texts/languages/{lang}.ts`

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `default` field in ExtensionStringArgument is rendered correctly by admin UI form generator | Code Examples | If admin UI ignores `default`, the select dropdown may show no pre-selected value; would need to check frontend form rendering code |
| A2 | Vite proxy requests to `/api-proxy` are treated as same-origin and unaffected by COEP: credentialless | Architecture Patterns | If proxy requests are treated as cross-origin, API calls would fail; mitigation per D-06 is to add CORP headers |
| A3 | The `default` field value `'de'` is used when creating a new extension instance (not just as UI hint) | Code Examples | If it's UI-only, new extension configs might save without a defaultLanguage value |

## Open Questions (RESOLVED)

1. **Extension Sort Order (D-09 Tension)** (RESOLVED)
   - What we know: ExplorerService sorts extensions alphabetically by title via `localeCompare()`. "Lokale Spracherkennung" / "Local Speech Recognition" sorts before the existing cloud options.
   - What's unclear: Whether the user accepts alphabetical ordering (which puts local first) or truly requires it after cloud options.
   - Recommendation: Implement with the decided titles. If ordering is critical, consider a title prefix like "Transkription: Lokal" / "Transcription: Local" to sort alongside "Transcription: Azure OpenAI". Flag for user confirmation.
   - **Resolution:** Implementing with D-08 titles as specified. The alphabetical sort means the local extension appears before cloud options. Plan 01 Task 1 action text documents this tension and explains that changing the sort order would require changing the D-08 locked titles. Accepted as-is per D-08.

2. **SVG Icon for Privacy Microphone (D-07)** (RESOLVED)
   - What we know: Existing extensions use inline SVG strings in the `logo` field. The user wants a microphone with lock/shield symbol.
   - What's unclear: Whether to create a custom SVG or use an existing icon from @tabler/icons-react (which has microphone and shield icons but would need combining).
   - Recommendation: Create a simple custom SVG combining microphone and shield elements, following the inline SVG pattern of existing extensions. The icon must be a self-contained SVG string (no external references).
   - **Resolution:** Creating a custom inline SVG combining microphone and shield elements per D-07. Plan 01 Task 1 specifies: viewBox="0 0 24 24", microphone path fill="#4A90D9", shield overlay fill="#27AE60". Self-contained string, no external references.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All | Yes | 24 (.nvmrc) | -- |
| npm | Package install | Yes | (bundled with Node) | -- |
| Vite | Build config | Yes | 8.0.8 | -- |
| NestJS | Backend extension | Yes | (existing) | -- |
| Playwright | Regression tests (INFRA-04) | Yes | (existing e2e setup) | -- |
| PostgreSQL | Backend runtime | Yes | (Docker via npm run dev) | -- |

**Missing dependencies with no fallback:** None

**Missing dependencies with fallback:** None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (backend) | Jest (existing) |
| Framework (frontend) | Vitest 4.1.4 (existing) |
| Framework (e2e) | Playwright (existing) |
| Config file (backend) | backend/jest.config.* |
| Config file (frontend) | frontend/vite.config.ts (test section) |
| Config file (e2e) | e2e/playwright.config.ts |
| Quick run command (backend) | `cd backend && NODE_OPTIONS="$NODE_OPTIONS --experimental-vm-modules" npx jest --runInBand --forceExit src/extensions/other/local-transcribe.spec.ts` |
| Full suite command (backend) | `npm run test:backend` |
| Full suite command (e2e) | `npm run test:e2e` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | Vite config supports ONNX/Worker bundling | smoke | `cd frontend && npx vite build --mode development 2>&1 \| head -20` (build succeeds) | N/A (config verification) |
| INFRA-02 | COOP/COEP headers present | smoke | `curl -sI http://localhost:5173 \| grep -i cross-origin` | N/A (runtime check) |
| INFRA-03 | @huggingface/transformers installed | smoke | `cd frontend && node -e "require.resolve('@huggingface/transformers')"` | N/A (dependency check) |
| INFRA-04 | No regression from headers | e2e | `npm run test:e2e` | Yes (existing suite) |
| EXT-01 | Extension registered with correct spec | unit | `cd backend && NODE_OPTIONS="$NODE_OPTIONS --experimental-vm-modules" npx jest --runInBand --forceExit src/extensions/other/local-transcribe.spec.ts` | Wave 0 |
| EXT-02 | Extension appears in admin UI | e2e | Covered by INFRA-04 regression (extension list endpoint) | Yes (existing) |
| EXT-03 | Mutual exclusivity via group | unit | Same as EXT-01 (test verifies group field) | Wave 0 |

### Sampling Rate
- **Per task commit:** Backend unit test for extension spec
- **Per wave merge:** Full backend test suite + E2E smoke
- **Phase gate:** Full E2E suite green (3 browsers) before verify

### Wave 0 Gaps
- [ ] `backend/src/extensions/other/local-transcribe.spec.ts` -- covers EXT-01, EXT-03
- [ ] No additional test framework install needed -- Jest and Vitest already configured

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | -- (no auth changes) |
| V3 Session Management | No | -- (no session changes) |
| V4 Access Control | No | -- (extension uses existing access control) |
| V5 Input Validation | Yes (minimal) | ExtensionSpec argument schema validates `defaultLanguage` to `de`/`en` via `examples` array |
| V6 Cryptography | No | -- |

### Known Threat Patterns for This Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| COOP/COEP misconfiguration allowing SharedArrayBuffer without isolation | Information Disclosure | Verify `crossOriginIsolated` is `true` in browser; use `credentialless` not `unsafe-none` |
| Extension spec injection via i18n keys | Tampering | i18n keys are hardcoded in source, not user-supplied |

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `backend/src/extensions/other/azure-transcribe.ts`, `speech-to-text.ts` -- extension patterns
- Codebase inspection: `backend/src/domain/extensions/interfaces.ts` -- ExtensionSpec, ExtensionStringArgument interfaces
- Codebase inspection: `backend/src/domain/extensions/services/explorer-service.ts` -- auto-discovery and sorting
- Codebase inspection: `backend/src/extensions/module.ts` -- ExtensionLibraryModule provider registration
- Codebase inspection: `frontend/vite.config.ts` -- current Vite configuration
- npm registry: `@huggingface/transformers@4.2.0` -- version and dependencies verified
- npm registry: `vite@8.0.8` -- version verified
- Context7 `/huggingface/transformers.js` -- Web Worker singleton pattern, env configuration
- Context7 `/vitejs/vite` -- server.headers, optimizeDeps.exclude documentation

### Secondary (MEDIUM confidence)
- [MDN: Cross-Origin-Embedder-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy) -- COEP values and semantics
- [Can I Use: COEP credentialless](https://caniuse.com/mdn-http_headers_cross-origin-embedder-policy_credentialless) -- browser support (Chrome 96+, Firefox 119+, no Safari)
- [Vite Issue #16536](https://github.com/vitejs/vite/issues/16536) -- HMR WebSocket blocking with require-corp
- [Vite COOP/COEP Gist](https://gist.github.com/mizchi/afcc5cf233c9e6943720fde4b4579a2b) -- server.headers confirmed working in Vite 5.4+
- [Chrome Blog: COEP credentialless](https://developer.chrome.com/blog/coep-credentialless-origin-trial) -- credentialless semantics

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified against npm registry, codebase patterns are clear
- Architecture: HIGH -- extension system thoroughly inspected, Vite config patterns well-documented
- Pitfalls: HIGH -- COOP/COEP pitfalls verified against browser specs and Vite issues; HMR issue confirmed

**Research date:** 2026-05-07
**Valid until:** 2026-06-07 (stable domain, 30 days)
