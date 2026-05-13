# Phase 1: Infrastructure & Backend Extension - Pattern Map

**Mapped:** 2026-05-07
**Files analyzed:** 8 (2 new, 6 modified)
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/src/extensions/other/local-transcribe.ts` | extension | config-marker | `backend/src/extensions/other/azure-transcribe.ts` | exact |
| `backend/src/extensions/other/local-transcribe.spec.ts` | test | unit | `backend/src/extensions/other/azure-transcribe.spec.ts` | exact |
| `frontend/vite.config.ts` | config | build | self (existing file) | exact |
| `frontend/package.json` | config | dependency | self (existing file) | exact |
| `backend/src/extensions/module.ts` | config | registration | self (existing file) | exact |
| `backend/src/localization/i18n/en/texts.json` | i18n | config | self (existing `transcribe` entry) | exact |
| `backend/src/localization/i18n/de/texts.json` | i18n | config | self (existing `transcribe` entry) | exact |
| `frontend/src/pages/chat/conversation/ChatInput.tsx` | component | request-response | self (existing filter at line 180) | exact |

## Pattern Assignments

### `backend/src/extensions/other/local-transcribe.ts` (extension, config-marker) -- NEW FILE

**Analog:** `backend/src/extensions/other/azure-transcribe.ts` (lines 1-56)

**Imports pattern** (lines 1-4):
```typescript
import { ChatMiddleware } from '../../domain/chat';
import { Extension, ExtensionConfiguration, ExtensionSpec } from '../../domain/extensions';
import { User } from '../../domain/users';
import { I18nService } from '../../localization/i18n.service';
```

**Core marker-extension pattern** (lines 6-48):
```typescript
@Extension()
export class AzureTranscribeExtension implements Extension<TranscribeExtensionConfiguration> {
  constructor(private readonly i18n: I18nService) {}

  get spec(): ExtensionSpec {
    return {
      name: 'transcribe-azure',
      group: 'speech-to-text',
      title: this.i18n.t('texts.extensions.transcribe.title'),
      logo: '...SVG...',
      type: 'other',
      description: this.i18n.t('texts.extensions.transcribe.description'),
      arguments: {
        apiVersion: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.apiVersion'),
          required: true,
          format: 'select',
          examples: ['2024-06-01', '2025-03-01-preview'],
        },
      },
    };
  }

  getMiddlewares(_user: User): Promise<ChatMiddleware[]> {
    return Promise.resolve([]);
  }
}
```

Key differences for `local-transcribe.ts`:
- `name: 'transcribe-local'` (not `transcribe-azure`)
- `group: 'speech-to-text'` (same -- ensures mutual exclusivity)
- `type: 'other'` (same -- marker extension with no middlewares)
- i18n keys use `texts.extensions.localTranscribe.*` (not `transcribe.*`)
- Single config argument `defaultLanguage` with `format: 'select'`, `examples: ['de', 'en']`, `default: 'de'`, `required: true`
- The `default` field is new compared to azure-transcribe's arguments -- verify admin UI handles it

**Config type pattern** (lines 51-56):
```typescript
export type TranscribeExtensionConfiguration = ExtensionConfiguration & {
  apiKey: string;
  instanceName: string;
  deploymentName: string;
  apiVersion: string;
};
```

For local-transcribe, simplify to:
```typescript
export type LocalTranscribeConfiguration = ExtensionConfiguration & {
  defaultLanguage: 'de' | 'en';
};
```

**Secondary analog:** `backend/src/extensions/other/speech-to-text.ts` (lines 1-24) -- shows the simplest marker extension (no arguments, no config type). Useful for understanding the minimal pattern, but `azure-transcribe.ts` is closer because it has config arguments.

---

### `backend/src/extensions/other/local-transcribe.spec.ts` (test, unit) -- NEW FILE

**Analog:** `backend/src/extensions/other/azure-transcribe.spec.ts` (lines 1-52)

**Full test pattern:**
```typescript
import { I18nService } from '../../localization/i18n.service';
import { AzureTranscribeExtension } from './azure-transcribe';

describe('AzureTranscribeExtension', () => {
  let extension: AzureTranscribeExtension;

  const i18n = {
    t: (val: string) => val,
  } as unknown as I18nService;

  beforeEach(() => {
    extension = new AzureTranscribeExtension(i18n);
  });

  describe('spec', () => {
    it('should have correct name', () => {
      expect(extension.spec.name).toBe('transcribe-azure');
    });

    it('should have group set to speech-to-text', () => {
      expect(extension.spec.group).toBe('speech-to-text');
    });

    it('should have type set to other', () => {
      expect(extension.spec.type).toBe('other');
    });

    it('should have required arguments', () => {
      expect(extension.spec.arguments).toHaveProperty('apiKey');
      // ...
    });

    it('should have apiVersion as select with examples', () => {
      const apiVersionArg = extension.spec.arguments.apiVersion;
      expect(apiVersionArg).toMatchObject({
        required: true,
        format: 'select',
        examples: ['2024-06-01', '2025-03-01-preview'],
      });
    });
  });
});
```

Key differences for `local-transcribe.spec.ts`:
- Import `LocalTranscribeExtension` from `./local-transcribe`
- Test `name` equals `'transcribe-local'`
- Test `group` equals `'speech-to-text'`
- Test `type` equals `'other'`
- Test `defaultLanguage` argument matches `{ type: 'string', required: true, format: 'select', examples: ['de', 'en'], default: 'de' }`
- Test `getMiddlewares()` returns empty array (add this -- azure-transcribe test omits it but RESEARCH.md includes it)

**Test run command:**
```bash
cd backend && NODE_OPTIONS="$NODE_OPTIONS --experimental-vm-modules" npx jest --runInBand --forceExit src/extensions/other/local-transcribe.spec.ts
```

---

### `frontend/vite.config.ts` (config, build) -- MODIFY

**Analog:** self (lines 1-51)

**Current server block** (lines 42-50):
```typescript
  server: {
    proxy: {
      '/api-proxy': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api-proxy/, ''),
      },
    },
  },
```

**Modifications required (3 additive blocks):**

1. Add `headers` to the existing `server` block (before or after `proxy`):
```typescript
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
```

2. Add `optimizeDeps` as a new top-level config key:
```typescript
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
```

3. Add `worker` as a new top-level config key:
```typescript
  worker: {
    format: 'es',
  },
```

No existing imports or plugins change. The `resolve`, `test`, and `plugins` sections stay untouched.

---

### `backend/src/extensions/module.ts` (config, registration) -- MODIFY

**Analog:** self (lines 1-141)

**Import pattern** (add after line 21, alongside other imports from `./other/`):
```typescript
import { AzureTranscribeExtension } from './other/azure-transcribe';
import { CustomPromptExtension } from './other/custom';
import { SpeechToTextExtension } from './other/speech-to-text';
// ADD:
import { LocalTranscribeExtension } from './other/local-transcribe';
```

**Provider registration pattern** (add to providers array, lines 105-138):
```typescript
providers: [
  ...dynamicProviders,
  // ... existing entries ...
  AzureTranscribeExtension,
  // ADD (alphabetical position):
  LocalTranscribeExtension,
  // ... existing entries ...
  SpeechToTextExtension,
],
```

The providers array is alphabetically ordered. `LocalTranscribeExtension` goes between `GroundingWithBingSearchExtension` (line 126) and `MCPToolsExtension` (line 127), or wherever alphabetical order places it among the existing entries.

---

### `backend/src/localization/i18n/en/texts.json` (i18n, config) -- MODIFY

**Analog:** existing `transcribe` and `speechToText` entries (lines 209-216)

**Existing pattern:**
```json
    "speechToText": {
      "title": "Speech To Text",
      "description": "Allows speech input via microphone icon"
    },
    "transcribe": {
      "title": "Transcription: Azure OpenAI",
      "description": "Transcribe audio recordings to text using Azure OpenAI"
    },
```

**New entry to add** (after `transcribe` block, before `filesInConversation`):
```json
    "localTranscribe": {
      "title": "Local Speech Recognition",
      "description": "Transcribe audio locally in the browser - audio data never leaves your device",
      "defaultLanguage": "Default Language"
    },
```

---

### `backend/src/localization/i18n/de/texts.json` (i18n, config) -- MODIFY

**Analog:** existing `transcribe` and `speechToText` entries (lines 209-216)

**Existing pattern:**
```json
    "speechToText": {
      "title": "Spracheingabe",
      "description": "Erlaubt Spracheingaben über ein Mikrofon-Icon"
    },
    "transcribe": {
      "title": "Transcription: Azure OpenAI",
      "description": "Audioaufnahmen mit Azure OpenAI in Text transkribieren"
    },
```

**New entry to add:**
```json
    "localTranscribe": {
      "title": "Lokale Spracherkennung",
      "description": "Audio wird lokal im Browser transkribiert - Audiodaten verlassen Ihr Geraet nicht",
      "defaultLanguage": "Standardsprache"
    },
```

---

### `frontend/src/pages/chat/conversation/ChatInput.tsx` (component, request-response) -- MODIFY

**Analog:** self (lines 179-183)

**Current filter pattern** (line 180):
```typescript
  const voiceExtensions =
    configuration?.extensions?.filter((e) => e.name === 'speech-to-text' || e.name === 'transcribe-azure') ?? [];
```

**Modification:** Add `'transcribe-local'` to the filter:
```typescript
  const voiceExtensions =
    configuration?.extensions?.filter(
      (e) => e.name === 'speech-to-text' || e.name === 'transcribe-azure' || e.name === 'transcribe-local',
    ) ?? [];
```

Note: Lines 182-183 may also need attention for Phase 2 (frontend UI integration), but in Phase 1 the extension should at minimum be recognized. Whether Phase 1 adds a new conditional branch (`showLocalTranscribe`) depends on whether the planner scopes frontend UI work to Phase 1 or Phase 2.

---

### `frontend/package.json` (config, dependency) -- MODIFY

**Modification:** Add `@huggingface/transformers` to dependencies:
```json
"@huggingface/transformers": "4.2.0"
```

Best done via: `cd frontend && npm install @huggingface/transformers@4.2.0`

---

## Shared Patterns

### Extension Registration (3-step checklist)
**Source:** `backend/src/extensions/module.ts` lines 1-141 + `backend/src/extensions/other/azure-transcribe.ts`
**Apply to:** `local-transcribe.ts`, `module.ts`

Every new extension requires:
1. Create extension file with `@Extension()` decorator (file in `backend/src/extensions/other/`)
2. Import and add to `providers` array in `ExtensionLibraryModule.register()` (`backend/src/extensions/module.ts`)
3. Add i18n keys in both `de/texts.json` and `en/texts.json` under `extensions.<camelCaseName>`

### i18n Key Pattern
**Source:** `backend/src/localization/i18n/en/texts.json` lines 209-216
**Apply to:** Both `en/texts.json` and `de/texts.json`

All extension i18n keys follow the structure:
```
texts.extensions.<camelCaseName>.title
texts.extensions.<camelCaseName>.description
texts.extensions.<camelCaseName>.<argumentName>  (for each config field label)
```

### Marker Extension Pattern (No Middleware)
**Source:** `backend/src/extensions/other/speech-to-text.ts` lines 1-24
**Apply to:** `local-transcribe.ts`

Speech extensions are "marker" extensions:
- `type: 'other'`
- `getMiddlewares()` returns `Promise.resolve([])`
- Logic lives in the frontend, not backend
- Backend only provides configuration and mutual exclusivity via `group`

### Select Dropdown Config Pattern
**Source:** `backend/src/extensions/other/azure-transcribe.ts` lines 38-41
**Apply to:** `local-transcribe.ts` (defaultLanguage argument)

```typescript
format: 'select',
examples: ['value1', 'value2'],  // dropdown options
```
The admin UI auto-generates a select dropdown from the `examples` array when `format` is `'select'`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| -- | -- | -- | All files have exact analogs in the codebase |

## Metadata

**Analog search scope:** `backend/src/extensions/`, `frontend/`, `backend/src/localization/`
**Files scanned:** 8 analog candidates read
**Pattern extraction date:** 2026-05-07
