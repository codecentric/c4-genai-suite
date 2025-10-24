# Copilot Coding Agent – Repository Onboarding Guide

(This file is intentionally task‑agnostic. Trust these instructions first; only search the codebase when the required fact is missing here or appears incorrect.)

---

## 1. High‑Level Overview

c4 GenAI Suite is a modular GenAI chatbot platform consisting of:
- Frontend: React + TypeScript (UI for chats, assistants, extensions).
- Backend: NestJS (TypeScript) API, authentication, persistence (PostgreSQL), LLM & extension orchestration, migrations.
- REI-S Service: Python (FastAPI + LangChain) Retrieval / Extraction / Ingestion Server for RAG (vector stores: pgvector, Azure AI Search; embeddings: OpenAI-compatible, Azure OpenAI, Ollama, AWS, NVIDIA).
- Additional Python utility service: `services/confluence-importer` (imports Confluence content).
- E2E test suite (Playwright) under `/e2e` orchestrated by custom scripts in `/scripts`.
- Deployment assets: Docker Compose (local), Helm chart (Kubernetes), container image build workflows.

Primary languages (approximate % from repo metadata): TypeScript (~87%), Python (~10%), JavaScript helper scripts, plus minor Dockerfile/CSS assets.

Key extensibility concept: “Assistants” aggregate “extensions” (LLM providers, tools such as Bing Search, MCP servers, RAG search, calculators, custom system prompts).

---

## 2. Repository Layout (Important Paths)

| Path | Purpose |
|------|---------|
| `/package.json` | Root orchestration scripts (multi-project dev/test, generation scripts). |
| `/backend/` | NestJS API (own `package.json`, migrations, extensions). |
| `/frontend/` | React UI (not fully listed here; assume standard Vite/CRA-like structure). |
| `/services/reis/` | Python RAG server (Poetry, FastAPI, LangChain). |
| `/services/confluence-importer/` | Python utility (pyproject, Ruff, mypy). |
| `/e2e/` | Playwright test specs (include administrative, extension, expensive vision tests). |
| `/scripts/` | Node helper scripts: env setup, test harness (`run-tests.js`), process management. |
| `/helm-chart/` | Helm deployment artifacts (see its README). |
| `/dev/mcp-tool-as-server/` | Development MCP proxy tooling. |
| `.github/workflows/` | CI pipelines (backend, frontend, e2e, quality gate, security & release workflows). |

Other root docs (mentioned but not shown): `README.md`, `CONTRIBUTING.md`, `DEVELOPERS.md`, likely `docker-compose.yml`.

---

## 3. Build, Run & Validation – Canonical Sequences

### 3.1 Prerequisites

Mandatory before most tasks:
1. Install a recent LTS Node.js (if unspecified, default to Node 20 LTS first; adjust only if CI indicates a different required version).
2. Python 3.12+ (REI-S requires `>=3.12.0`; Confluence importer requires `>=3.13.2` per its pyproject).
3. Docker + Docker Compose (for full stack & E2E convenience).
4. PostgreSQL (if not using Docker stack).
5. For extension / RAG / embedding provider tests: relevant API keys (e.g., `AZURE_OPEN_AI_API_KEY` for extension tests, Langfuse keys if tracing enabled).

ALWAYS run `npm install` at the repository root after pulling changes that touch JS/TS workspaces or scripts. (Root scripts orchestrate multi-part operations.)

### 3.2 Quick All‑In-One Local Stack (Recommended)

```
docker compose up
# Then browse to http://localhost:3333
# Login: admin@example.com / secret (default credentials)
```

This brings up backend, frontend, REI-S, local Ollama, Postgres, etc. Use for manual UI validation or rapid exploratory testing.

### 3.3 Non-Docker Dev (Focused Component Work)

Backend only:
```
cd backend
cp .env.example .env   # ALWAYS create .env before starting the backend.
npm install
npm run start:dev
```
Run migrations when entity changes occur:
```
npm run migration:generate --name=<meaningful_name>
npm run migration:run
```
Revert last migration if needed:
```
npm run migration:revert
```

Frontend only (pattern inferred – verify existing scripts in `/frontend/package.json`):
```
cd frontend
npm install
npm run dev
```

REI-S service (Python, using Poetry):
```
cd services/reis
poetry install
# Start (entrypoint name may be e.g. main module; verify actual file):
poetry run uvicorn rei_s.<module>:app --reload  # Search only if module name unknown.
```
Generate OpenAPI spec (provided script):
```
poetry run generate-api-spec
```

Confluence importer (Python):
```
cd services/confluence-importer
pip install .  # or: python -m pip install .
# Or create dev environment:
pip install -e .[dev]
pytest
```

### 3.4 Root Orchestration Scripts (from `package.json`)

Notable scripts (prefix `npm run <script>` from root):
- `prepare`: likely Husky install hook.
- `install-all`: Installs backend, frontend, REI-S (Poetry) dependencies if available (skips if Poetry missing).
- `env`: `node scripts/env-setup.js --noOverwrites` (ALWAYS run after cloning if environment not set).
- `env:fix`: Re-applies environment defaults allowing overwrites (use when variables drift).
- `dev`: `node scripts/run-tests.js --devSetup` style (aggregated dev environment). Use when you need concurrently running services for development. Prefer this over ad-hoc starting.
- `dev:force`: Same as dev but forces using running services (skip auto-start guard).
- Test umbrella:
  - `test` = frontend + backend + e2e (subset) combined.
  - `test:frontend`, `test:backend`, `test:reis`: targeted unit tests.
  - `test:e2e` family (see below).
- E2E variants:
  - `test:e2e` default UI-less run.
  - `test:e2e:ui` interactive UI (Playwright).
  - `test:e2e:debug` adds debugging flags.
  - `test:e2e:extensions`, `test:e2e:extensions-ui`, etc. (extension-specific sets; require `AZURE_OPEN_AI_API_KEY`).
  - `test:e2e:expensive*` (vision / heavy usage; avoid in quick validation).
  - `test:noKill` / `test:force` toggles container/process auto-management.
- Code generation:
  - `generate-apis`, `generate-clients`, `generate-specs` (split per component: backend, reis).
- REI-S helper:
  - `generate-specs-reis` will run Python script inside `services/reis` (needs Poetry).
- Backend tool generation:
  - `generate-clients-backend`, `generate-tools-backend`, `generate-reis`.

ALWAYS prefer existing script over crafting new ad-hoc commands—CI expects their side-effects.

### 3.5 E2E Tests – Reliable Execution Recipe

E2E tests require deterministic DB state and single-threaded execution.

Minimal working sequence from root:
```
npm install
npm run env
npm run test:e2e            # or a narrower subset to save time
```
To run a single spec (recommended during development):
```
node scripts/run-tests.js --file tests/administration/permissions.spec.ts
```
Debug example:
```
node scripts/run-tests.js --file extension-tests/azure-mcp-server.spec.ts --debug
```
If containers linger (known issue on macOS):
1. Manually `docker ps` and `docker rm -f <stale_ids>`.
2. Re-run with `--noAutoKill` only if you plan manual shutdown.

If extension tests are silently skipped, confirm `AZURE_OPEN_AI_API_KEY` is exported.

### 3.6 Linting / Static Analysis

TypeScript lint config not shown here; rely on:
- Linting likely handled in `quality-gate` workflow.
- Pre-commit: Husky + lint-staged (triggered by `prepare` on install).
Python (REI-S & Confluence importer):
- Ruff (style & lint) configured with `line-length = 120`.
- mypy strict enabled (`strict = true`).
Run manually:
```
cd services/reis
poetry run ruff check .
poetry run mypy .
```
Same for Confluence importer (using pip/ruff/mypy installed via its dev group).

### 3.7 Migrations (Backend)

ALWAYS generate and run migrations when changing entities:
```
npm run migration:generate --name=<change>
npm run migration:run
```
Ensure DB container/service is running first (Docker Compose or manually). If diff generation fails, confirm DB schema matches current migration baseline.

### 3.8 Langfuse (Optional Tracing)

Set environment:
```
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_BASEURL=https://cloud.langfuse.com
```
If not set, tracing simply remains inactive—do not fail build.

### 3.9 Regenerating OpenAPI / Clients

When API changes:
```
npm run generate-apis
npm run generate-clients
```
If REI-S interfaces change:
```
npm run generate-specs-reis
```
ALWAYS commit regenerated specs & clients if CI expects them (failing to do so may break build consistency checks).

---

## 4. CI / Validation Pipelines

Observed workflows (names under `.github/workflows/`):
- `backend.yaml`, `frontend.yaml`: Component-specific build & test.
- `e2e.yaml`, `e2e-complete.yaml`, `e2e-template.yaml`: E2E matrix / template runs.
- `quality-gate.yaml`: Aggregated quality (lint, unit tests, maybe coverage & security).
- `build-container-images.yaml`, `build-dev-helper-container-images.yaml`, `push_images.yaml`: Image builds & pushes.
- `reis.yaml`, `reis-stresstest.yaml`: REI-S service build/test/performance.
- `gitleaks.yaml`: Secret scanning (NEVER commit secrets).
- `dependency-review.yaml`, `dependabot.yaml`: Supply chain & automated dependency PRs.
- Release workflows: `release-preparation.yaml`, `release-notification.yaml`, `release-publish-chart-and-container-images.yaml`.
- `helm-chart.yaml`: Helm packaging & linting.
- `confluence-importer.yaml`: Python utility build/test.

Local replication strategy:
1. Run `npm install`.
2. Run `npm run test` (covers frontend/backend/e2e subset).
3. Run Python service tests:
   (cd services/reis && poetry install && poetry run pytest)
   (cd services/confluence-importer && pip install -e .[dev] && pytest)
4. Optionally run secret scan (tool may be `gitleaks` if installed).
5. Ensure no unformatted / ungenerated artifacts (re-run generation scripts before committing).

---

## 5. Common Pitfalls & Mitigations

| Issue | Symptom | Resolution |
|-------|---------|-----------|
| Missing environment variables | Backend start or tests fail early | Run `npm run env` (non-destructive) or consult `.env.example` in each component. |
| Extension E2E tests skipped | Tests report skip | Export `AZURE_OPEN_AI_API_KEY`. |
| REI-S spec generation fails | Script cannot find Poetry | Install Poetry (`pip install poetry`) or skip spec generation when not touching REI-S. |
| Stale Docker containers after E2E | Ports already bound, tests hang | Manually prune stale containers; re-run with `--noAutoKill` only deliberately. |
| Migration generation empty | No SQL emitted | Confirm DB is running & entities actually changed; if schema drift: run pending migrations first. |
| Lint / type errors in Python | Ruff/mypy failures | Run tools locally before commit; adjust code to satisfy strict mypy. |
| Secret leakage risk | CI gitleaks failure | Remove secret, rotate key, force push fix if needed. |

---

## 6. Adding / Modifying Extensions (Backend)

Per backend README:
1. Decorate class with `@Extension`.
2. Implement `Extension` interface.
3. Add provider to `src/extensions/module.ts`.
ALWAYS regenerate any needed specs/clients afterwards if API surfaces changed.

---

## 7. Python Service Quality Gates

REI-S & Confluence importer enforce:
- Ruff selected codes: `E,W,F,N,A,B` (+ docs `D` in importer).
- Mypy strict: add explicit types, avoid implicit `Any`.
Run before commit to prevent CI churn.

---

## 8. File / Artifact Inventory Highlights

Root key files (partial but high-value):
- `README.md`
- `package.json` (multi-component scripts)
- `.gitignore`
- `scripts/` (env-setup.js, run-tests.js, process-management.js)
- `.github/workflows/*.yaml`
- `backend/README.md`
- `e2e/README.md`
- `services/reis/pyproject.toml`
- `services/confluence-importer/pyproject.toml`
- `helm-chart/` (deployment reference)
- `docker-compose.yml` (assumed for local stack)

Use these first for context instead of searching.

---

## 9. Performance & Time Expectations (Guidance)

- Full `docker compose up` first start: pull/build images (may take several minutes depending on network).
- `npm run test:e2e` with full suite can be lengthy (sequential by design).
- Targeted single-spec runs complete faster; prefer during iteration.
- Python dependency install (Poetry) adds extra minutes on cold environments—cache where possible.

---

## 10. Contribution Hygiene

ALWAYS before pushing:
```
npm install
npm run env
npm run generate-apis && npm run generate-clients   # if backend API changed
npm run test
(cd services/reis && poetry run pytest)             # if touched REI-S
```
Ensure no stray debug logs or secrets. Commit related migrations with entity changes.

---

## 11. When to Search

Only perform repository searches if:
- You need a file not listed here (e.g., specific backend entity path).
- A script name referenced here fails (indicating rename).
- An environment variable required by a new provider is undocumented.

Otherwise rely on this document to minimize exploratory commands.

---

## 12. Recap – Golden Rules

1. ALWAYS run `npm install` (root) after pulling new code.
2. ALWAYS run `npm run env` once per fresh clone or when env drifts.
3. Use provided scripts (`dev`, `test:*`, migration scripts) instead of ad-hoc commands.
4. Generate & commit migrations for backend entity updates.
5. Provide required API keys (Azure, Langfuse, etc.) when enabling optional features—tests will otherwise skip or degrade gracefully.
6. Keep Python services’ type and lint checks clean before opening PRs.
7. Do not commit secrets; gitleaks CI will fail.
8. Trust this guide; search only to fill genuine gaps.

---

By following the above, a coding agent should minimize failed builds, flaky tests, and unnecessary repository scans. Proceed with confidence.
