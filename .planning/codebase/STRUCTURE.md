# Codebase Structure

> Mapped: 2026-05-07

## Overview

Monorepo with 3 core services, shared tooling, and deployment infrastructure.

```
c4-genai-suite/
├── backend/          # NestJS API server (TypeScript)
├── frontend/         # React SPA (TypeScript + Vite)
├── services/reis/    # RAG/embedding service (Python FastAPI)
├── e2e/              # Playwright end-to-end tests
├── dev/              # Local dev infrastructure (Docker, mock services)
├── helm-chart/       # Kubernetes deployment
├── scripts/          # Build/test orchestration scripts
├── demo/             # Demo configuration
└── .github/workflows/ # CI/CD pipelines
```

## Root-Level Files

| File | Purpose |
|------|---------|
| `package.json` | Monorepo orchestration, workspace scripts |
| `docker-compose.yml` | Production-like multi-container setup |
| `docker-compose-dev.yml` | Development composition with all services |
| `Dockerfile` | Production container build |
| `Caddyfile` | Reverse proxy config |
| `lint-staged.config.js` | Pre-commit lint hooks |
| `.nvmrc` | Node.js version pin (24) |
| `.python-version` | Python version pin (>=3.12) |
| `.gitleaks.toml` | Secret scanning config |

## Backend (`/backend`)

### Source Layout (`backend/src/`)

```
src/
├── main.ts                    # Application entry point (NestFactory)
├── app.module.ts              # Root NestJS module
├── config/                    # Configuration module
├── controllers/               # HTTP layer (REST endpoints)
│   ├── audit-log/
│   ├── auth/
│   ├── blobs/
│   ├── conversations/
│   ├── extensions/
│   ├── files/
│   ├── health/
│   ├── responses/
│   ├── settings/
│   ├── transcription/
│   ├── usages/
│   ├── users/
│   └── shared.ts
├── domain/                    # Business logic layer
│   ├── audit-log/use-cases/
│   ├── auth/strategies/
│   ├── chat/                  # Core chat pipeline
│   │   ├── middlewares/       # Chat processing chain (15 middlewares)
│   │   ├── services/
│   │   └── use-cases/
│   ├── database/
│   │   ├── entities/          # TypeORM entities (17 entities)
│   │   └── repositories/
│   ├── extensions/
│   │   ├── services/
│   │   └── use-cases/
│   ├── files/use-cases/
│   ├── settings/use-cases/
│   ├── transcription/providers/
│   └── users/use-cases/
├── extensions/                # Extension implementations
│   ├── models/                # LLM providers (8 providers)
│   ├── tools/                 # Tool extensions (18 tools)
│   ├── other/                 # Misc extensions (5)
│   └── examples/              # Reference extension (always-42)
├── lib/                       # Shared utilities
├── localization/i18n/         # Backend i18n
├── metrics/                   # Prometheus metrics
├── migrations/                # TypeORM migrations (43 migrations)
├── openapi/                   # OpenAPI spec generation
└── utils/                     # Helper utilities
```

### Key Files

| File | Purpose |
|------|---------|
| `backend/src/main.ts` | NestJS bootstrap, validation pipe setup |
| `backend/src/domain/chat/middlewares/index.ts` | Chat middleware chain composition |
| `backend/src/domain/chat/middlewares/execute-middleware.ts` | Core LLM execution via ai-sdk |
| `backend/src/domain/database/entities/index.ts` | Entity barrel export |
| `backend/src/extensions/models/model-tools.ts` | Shared model extension utilities |

### Chat Middlewares (processing order)

| Middleware | File |
|-----------|------|
| Exception handler | `exception-middleware.ts` |
| User resolution | `get-user-middleware.ts` |
| Usage checking | `check-usage-middleware.ts` |
| LLM selection | `choose-llm-middleware.ts` |
| History retrieval | `get-history-middleware.ts` |
| History summarization | `summarize-history-middleware.ts` |
| Default prompt | `default-prompt-middleware.ts` |
| Prompt rendering | `render-prompt-middleware.ts` |
| UI updates | `ui-middleware.ts` |
| LLM execution | `execute-middleware.ts` |
| Executor | `executor-middleware.ts` |
| Completion | `complete-middleware.ts` |
| Usage tracking | `store-usage-middleware.ts` |
| Langfuse observability | `langfuse-middleware.ts` |

### Database Entities

`backend/src/domain/database/entities/`: `audit-log`, `blob`, `bucket`, `cache`, `configuration`, `configuration-user`, `conversation`, `conversation-file`, `extension`, `file`, `message`, `session`, `setting`, `usage`, `user`, `user-group`

### Model Extensions

`backend/src/extensions/models/`: `azure-open-ai`, `bedrock-ai`, `google-genai`, `mistral`, `nvidia`, `ollama`, `open-ai`, `open-ai-compatible`

### Tool Extensions

`backend/src/extensions/tools/`: `azure-ai-search`, `azure-dall-e`, `azure-gpt-image-1`, `bing-web-search`, `brave-web-search`, `calculator`, `dall-e`, `duckduckgo-web-search`, `files`, `files-conversation`, `files-vision`, `gemini-image`, `gpt-image-1`, `grounding-with-bing`, `mcp-tools`, `open-api`, `whole-files-conversation`

## Frontend (`/frontend`)

### Source Layout (`frontend/src/`)

```
src/
├── main.tsx                   # React DOM entry point
├── App.tsx                    # Root component, routing
├── api/
│   ├── generated/             # Auto-generated API client (DO NOT EDIT)
│   │   ├── apis/
│   │   ├── models/
│   │   ├── runtime.ts
│   │   └── index.ts
│   └── state/
│       ├── apiAppClient.ts    # API client singleton
│       └── zustand/
│           └── appClientStore.ts  # Global Zustand store
├── assets/                    # Static assets
├── components/                # Shared UI components (44 files)
│   ├── NavigationBar.tsx
│   ├── Markdown.tsx
│   ├── FilterableTable.tsx
│   ├── ConfirmDialog.tsx
│   ├── DialogProvider.tsx
│   ├── MantineThemeProvider.tsx
│   ├── ThemeProvider.tsx
│   └── ...
├── hooks/
│   ├── api/
│   │   ├── extensions.ts      # Extension API hooks (TanStack Query)
│   │   └── files.ts           # File API hooks
│   ├── dialogs.ts
│   ├── profile.ts
│   ├── theme.ts
│   └── useAuthSettings.ts
├── lib/                       # Utility functions
├── mock/                      # Mock data for tests
├── pages/
│   ├── admin/
│   │   ├── dashboard/         # Admin dashboard
│   │   ├── extensions/        # Extension management
│   │   ├── files/             # File/bucket management
│   │   ├── audit-log/         # Audit log viewer
│   │   ├── theme/             # Theme/logo customization
│   │   ├── user-groups/       # User group management
│   │   └── users/             # User management
│   ├── chat/
│   │   ├── conversation/      # Chat conversation view
│   │   │   ├── ChatItem/      # Individual message component
│   │   │   └── DragAndDropLayout/
│   │   ├── files/             # Chat file management
│   │   └── state/zustand/     # Chat-specific state
│   └── login/                 # Login page
└── texts/
    └── languages/             # i18n translation files
```

### Configuration Files

| File | Purpose |
|------|---------|
| `frontend/vite.config.ts` | Vite build config |
| `frontend/tsconfig.json` | TypeScript config |
| `frontend/postcss.config.js` | PostCSS/Tailwind setup |
| `frontend/vitest.setup.ts` | Test setup (Mantine mocks) |
| `frontend/knip.json` | Dead code detection |
| `frontend/openapitools.json` | API client generation config |

## REI-S (`/services/reis`)

### Source Layout (`services/reis/rei_s/`)

```
rei_s/
├── app.py                     # FastAPI app instance
├── app_factory.py             # App factory with middleware
├── config.py                  # Pydantic settings
├── scripts.py                 # CLI entry points
├── mcp.py                     # MCP protocol support
├── utils.py                   # Shared utilities
├── logger.py / logger_formatter.py
├── prometheus_server.py       # Metrics server
├── routes/
│   ├── files.py               # File upload/search endpoints
│   └── health.py              # Health check
├── services/
│   ├── store_service.py       # Core store orchestration
│   ├── embeddings_provider.py # Embedding model selection
│   ├── filestore_adapter.py   # File storage abstraction
│   ├── filestore_provider.py
│   ├── vectorstore_adapter.py # Vector store abstraction
│   ├── vectorstore_provider.py
│   └── multiprocess_utils.py
│   ├── filestores/
│   │   ├── s3.py              # S3/MinIO file storage
│   │   ├── filesystem.py      # Local filesystem storage
│   │   └── devnull.py         # No-op store (testing)
│   ├── vectorstores/
│   │   ├── pgvector.py        # PostgreSQL vector search
│   │   ├── azure_ai_search.py # Azure Cognitive Search
│   │   └── devnull_store.py   # No-op store (testing)
│   └── formats/               # Document format parsers (18 providers)
│       ├── pdf_provider.py
│       ├── ms_word_provider.py
│       ├── ms_excel_provider.py
│       ├── ms_ppt_provider.py
│       ├── html_provider.py
│       ├── markdown_provider.py
│       ├── json_provider.py
│       ├── xml_provider.py
│       ├── yaml_provider.py
│       ├── code_provider.py
│       ├── plain_provider.py
│       ├── outlook_provider.py
│       ├── office_provider.py
│       ├── libre_office_provider.py
│       ├── video_transcription_provider.py
│       ├── voice_transcription_provider.py
│       └── abstract_format_provider.py
└── types/                     # Type definitions
```

## E2E Tests (`/e2e`)

```
e2e/
├── playwright.config.ts       # Playwright configuration
├── tests/
│   ├── systems-check.spec.ts  # Smoke test
│   ├── administration/        # Admin feature tests (9 specs)
│   │   ├── chat.spec.ts
│   │   ├── configurations.spec.ts
│   │   ├── docs.spec.ts
│   │   ├── permissions.spec.ts
│   │   ├── suggestions.spec.ts
│   │   ├── user.spec.ts
│   │   ├── userGroups.spec.ts
│   │   ├── userSettings.spec.ts
│   │   └── auditLog.spec.ts
│   ├── extension/             # Extension feature tests (10 specs)
│   │   ├── basic.spec.ts
│   │   ├── mcp-server.spec.ts
│   │   ├── user-args.spec.ts
│   │   └── ...
│   └── utils/
│       ├── fixtures.ts        # Custom Playwright fixtures
│       ├── helper.ts          # Test helpers (login, sendMessage)
│       ├── mock-llm-server.ts # Mock LLM for deterministic tests
│       └── config.ts
├── expensive-tests/           # Cost-bearing tests (real API calls)
├── postgres/                  # Test DB setup
└── minio/                     # Test object storage
```

## Dev Infrastructure (`/dev`)

| Directory | Purpose |
|-----------|---------|
| `dev/postgres/` | Local PostgreSQL with pgvector |
| `dev/minio/` | Local S3-compatible object storage |
| `dev/oauth-mock/` | Mock OAuth/OIDC provider |
| `dev/caddy-gateway-proxy/` | Reverse proxy for local dev |
| `dev/mcp-tool-as-server/` | MCP tool development server |

## CI/CD (`.github/workflows/`)

| Workflow | Purpose |
|----------|---------|
| `backend.yaml` | Backend lint, test, build |
| `frontend.yaml` | Frontend lint, test, build |
| `reis.yaml` | REI-S lint, test |
| `e2e.yaml` / `e2e-template.yaml` | E2E test orchestration |
| `quality-gate.yaml` | Combined quality gate |
| `build-container-images.yaml` | Docker image builds |
| `release-publish-chart-and-container-images.yaml` | Release pipeline |
| `gitleaks.yaml` | Secret scanning |
| `dependabot.yaml` | Dependency updates |
| `helm-chart.yaml` | Helm chart testing |

## Naming Conventions

- **Backend files**: kebab-case (`get-history-middleware.ts`, `azure-open-ai.ts`)
- **Frontend components**: PascalCase (`NavigationBar.tsx`, `ConfirmDialog.tsx`)
- **Frontend hooks**: camelCase with `use` prefix (`useAuthSettings.ts`)
- **Frontend tests**: `*.ui-unit.spec.tsx` (unit), `*.integration.spec.tsx` (integration)
- **Backend tests**: `*.spec.ts` (unit), `*.e2e.spec.ts` (e2e)
- **REI-S tests**: `*_test.py` (pytest convention)
- **Entities**: singular kebab-case (`user-group.ts`, `conversation-file.ts`)
- **Migrations**: timestamp-prefixed camelCase (`1722419098898-initial.ts`)

## Scripts (`/scripts`)

| Script | Purpose |
|--------|---------|
| `scripts/env-setup.js` | Generate `.env` files from templates |
| `scripts/process-management.js` | Dev server process orchestration |
| `scripts/run-tests.js` | Test runner with filtering support |

## Deployment (`/helm-chart`)

Helm chart for Kubernetes deployment with templates for backend, frontend, REI-S deployments, services, ingress, network policies, configmaps, and Grafana dashboards.
