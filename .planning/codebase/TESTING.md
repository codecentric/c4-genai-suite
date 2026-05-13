# Testing

> Mapped: 2026-05-07

## Overview

Four test frameworks across three services plus end-to-end:

| Layer | Framework | Config | Command |
|-------|-----------|--------|---------|
| Backend unit | Jest + ts-jest | `backend/jest.config.ts` | `npm run test:backend` |
| Backend e2e | Jest + testcontainers | `backend/jest.config.ts` (E2E project) | `npm run test:backend` |
| Frontend unit | Vitest + @testing-library/react | `frontend/vite.config.ts` | `npm run test:frontend` |
| E2E | Playwright | `e2e/playwright.config.ts` | `npm run test:e2e` |
| REI-S | pytest | `services/reis/pyproject.toml` | `npm run test:reis` |

## Backend Testing (Jest)

### Configuration

`backend/jest.config.ts` defines two Jest projects:

**Unit Tests**
- Pattern: `*.spec.ts` (excludes `*.e2e.spec.ts`)
- Transform: ts-jest
- Module alias: `src/*` → `<rootDir>/*`
- `maxWorkers: 1`

**E2E Tests**
- Pattern: `*.e2e.spec.ts`
- Global setup: `backend/jest.setup.e2e.ts` — spins up PostgreSQL via testcontainers
- Global teardown: `backend/jest.teardown.e2e.ts` — stops container
- Coverage excludes: `/generated/`, `/migrations/`

### Test Database Setup

`backend/jest.setup.e2e.ts` uses `@testcontainers/postgresql` with `postgres:17.5-alpine`:
- Container started before all E2E tests
- Connection URI set as `process.env.DB_URL`
- Container and client stored on `globalThis` for teardown
- In CI, setup is skipped (external DB assumed)

### File Locations

- Unit tests: co-located with source (`backend/src/extensions/models/open-ai.spec.ts`)
- E2E tests: co-located with controllers (`backend/src/controllers/settings/settings.e2e.spec.ts`)
- Model extensions share a base test suite: `backend/src/extensions/models/model-test.base.ts`

### Running Single Tests

```bash
cd backend && NODE_OPTIONS="$NODE_OPTIONS --experimental-vm-modules" npx jest --runInBand --forceExit path/to/test.spec.ts
```

## Frontend Testing (Vitest)

### Configuration

`frontend/vite.config.ts` — test block:
- Include patterns: `src/**/*.ui-unit.spec.*`, `src/**/*.integration.spec.*`
- Environment: `jsdom`
- Setup file: `frontend/vitest.setup.ts`
- `maxConcurrency: 1`
- Coverage: v8 provider, reporters: text/json/html/cobertura
- Excludes from coverage: `generated/`, `dist/`, `languages/`, `texts/`

### Test Setup (`frontend/vitest.setup.ts`)

Global setup for all frontend tests:
- Imports `@testing-library/jest-dom/vitest` for DOM matchers
- Mocks `react-syntax-highlighter` (ESM compatibility)
- Mocks Mantine-required browser APIs: `window.getComputedStyle`, `scrollIntoView`, `matchMedia`, `ResizeObserver`
- Calls `cleanup()` after each test

### Test Naming Convention

- **Unit tests**: `*.ui-unit.spec.tsx` — test components in isolation
- **Integration tests**: `*.integration.spec.tsx` — test with mocked API calls (MSW or similar)

### File Locations

Tests are co-located with their source components:
- `frontend/src/components/NavigationBar.ui-unit.spec.tsx`
- `frontend/src/pages/admin/users/CreateUserDialog.integration.spec.tsx`
- `frontend/src/pages/chat/conversation/ChatInput.ui-unit.spec.tsx`

### Running Single Tests

```bash
cd frontend && npx vitest run path/to/test.ts
```

## E2E Testing (Playwright)

### Configuration (`e2e/playwright.config.ts`)

- Test directory: `e2e/tests/`
- Test timeout: 120 seconds
- Assertion timeout: 30 seconds
- `fullyParallel: false`
- `workers: 1` (shared DB state)
- Retries: 2 in CI, 0 locally
- Artifacts: trace on first retry, screenshot on failure, video retained on failure
- Browsers: Chromium (with clipboard perms), Firefox (with async clipboard prefs)

### Custom Fixtures (`e2e/tests/utils/fixtures.ts`)

- `mockServerUrl` — worker-scoped fixture that starts a mock LLM server per worker
- Base port: 4100 + workerIndex
- Uses `startMockLLMServer()` from `e2e/tests/utils/mock-llm-server.ts`

### Test Helpers (`e2e/tests/utils/helper.ts`)

Key helper functions:
- `login(page, user?)` — navigate to `/login`, fill credentials, wait for redirect to `/chat`
- `goto(page, path)` — navigate to URL with config base
- `enterAdminArea(page)` — click user menu → Admin
- `logout(page)` — click user menu → Logout

Default credentials: `admin@example.com` / `secret`

### Test Organization

- `e2e/tests/administration/` — admin panel features (users, groups, configs, permissions, audit log, docs, suggestions, settings, chat)
- `e2e/tests/extension/` — extension features (basic chat, MCP server, user args, file search, a11y, viewport, configurable arguments)
- `e2e/tests/systems-check.spec.ts` — smoke test
- `e2e/expensive-tests/` — tests requiring real API calls (e.g., Azure Vision)

### Running Single E2E Tests

```bash
node scripts/run-tests.js --file tests/administration/userGroups.spec.ts --debug
```

## REI-S Testing (pytest)

### Configuration

`services/reis/tests/conftest.py` provides:

- `get_test_config()` — creates `Config` with `store_type="dev-null"` and `embeddings_type="random-test-embeddings"`
- `app` fixture (module-scoped) — creates FastAPI app with test config overrides, manual `ThreadPoolExecutor`
- Stress tests gated behind `--stress` CLI flag via `pytest_addoption`

### Test Organization

```
services/reis/tests/
├── conftest.py              # Shared fixtures
├── unit/
│   ├── app_test.py          # App endpoint tests
│   ├── app_multi_worker_test.py
│   ├── config_test.py       # Configuration tests
│   ├── format_providers_test.py  # Document parsing tests
│   ├── vector_store_azure_ai_test.py
│   ├── tmp_file_permission_test.py
│   └── utils.py
├── e2e/
│   ├── file_store_s3_test.py
│   ├── vector_store_azure_ai_test.py
│   ├── vector_store_pgvector_test.py
│   └── format_providers_whisper_test.py
├── stress/
│   ├── processing_test.py
│   └── wait_for_server.py
└── data/                    # Test fixtures and mock data
```

### Running REI-S Tests

```bash
cd services/reis && uv run pytest           # all tests
cd services/reis && uv run pytest --stress   # include stress tests
```

## Coverage

### Backend
- Reporters: html, text, text-summary, cobertura
- Excludes: `/generated/`, `/migrations/`

### Frontend
- Provider: v8
- Reporters: text, json, html, cobertura
- Excludes: `generated/`, `dist/`, `languages/`, `texts/`, `*.spec.*`, `*.config.ts`

## CI Integration

Each service has a dedicated GitHub Actions workflow:
- `backend.yaml` — runs `npm run test:backend`
- `frontend.yaml` — runs `npm run test:frontend`
- `reis.yaml` — runs `npm run test:reis`
- `e2e.yaml` — orchestrates full-stack E2E tests
- `quality-gate.yaml` — combined quality gate for PRs
