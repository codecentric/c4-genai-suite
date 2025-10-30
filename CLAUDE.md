# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

c4 GenAI Suite is an AI chatbot application with Model Context Protocol (MCP) integration, supporting all major LLMs and Embedding Models. The application is modular and extensible, allowing administrators to create assistants with different capabilities by adding extensions (RAG services, MCP servers, LLM models, tools).

**Architecture**: Three-tier application consisting of:
- **Frontend** (`/frontend`): React + TypeScript + Vite
- **Backend** (`/backend`): NestJS + TypeScript + PostgreSQL
- **REI-S** (`/services/reis`): Python FastAPI RAG server (Retrieval Extraction Ingestion Server)

## Development Commands

### Initial Setup
```bash
# Install all dependencies (frontend, backend, REI-S)
npm install

# Setup environment files (.env files created from .env.example)
npm run env

# Update environment files with new defaults
npm run env:fix
```

### Running the Application
```bash
# Start all services for development (PostgreSQL, frontend, backend)
npm run dev

# Force using already running services
npm run dev:force
```

**Access Points**:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- REI-S: http://localhost:3201
- Default credentials: `admin@example.com` / `secret` (from backend/.env)

**Logs**: All service logs are written to `./output/` directory. Use `tail -f ./output/*.log` to monitor all services.

### Testing
```bash
# Run all tests (frontend, backend, e2e)
npm test

# Run specific test suites
npm run test:frontend          # Frontend unit tests (Vitest)
npm run test:backend           # Backend unit tests (Jest)
npm run test:reis              # REI-S tests (pytest)
npm run test:e2e               # End-to-end tests (Playwright)

# Run single test file
node scripts/run-tests.js --file tests/path/to/test.spec.ts

# E2E test modes
npm run test:e2e:ui            # Playwright UI mode
npm run test:e2e:debug         # Debug mode with breakpoints
npm run test:force             # Reuse running services

# Extension and expensive tests
npm run test:e2e:extensions    # Only extension tests
npm run test:e2e:expensive     # Only expensive tests (large files)
```

**Note**: Some tests use large files via `git lfs`. Run `git lfs pull` to download them.

### Code Quality
```bash
# Frontend
cd frontend
npm run lint           # Check linting
npm run lint:fix       # Auto-fix linting issues
npm run format         # Format code with Prettier
npm test               # Run unit tests

# Backend
cd backend
npm run lint           # Check linting
npm run lint:fix       # Auto-fix linting issues
npm run format         # Format code with Prettier
npm test               # Run unit tests

# REI-S
cd services/reis
uv run ruff check      # Check linting
uv run ruff format     # Format code
uv run pytest          # Run tests
```

**Note**: Formatting and linting run automatically on commit via Husky pre-commit hooks.

### Building
```bash
# Frontend
cd frontend
npm run build          # Build production bundle to dist/

# Backend
cd backend
npm run build          # Compile TypeScript to dist/
npm run start:prod     # Run production build
```

## OpenAPI Workflow

The application uses OpenAPI specifications to define and generate type-safe API clients between services:
- **Frontend → Backend**: TypeScript client generated from backend OpenAPI spec
- **Backend → REI-S**: TypeScript client generated from REI-S OpenAPI spec

### Regenerating APIs (After API Changes)

**Regenerate all specs and clients:**
```bash
npm run generate-apis
```

**Or regenerate individually:**

**Backend API changed:**
```bash
cd backend
npm run generate-openapi-dev    # Generate backend-dev-spec.json

cd ../frontend
npm run generate-api            # Generate TypeScript client
```

**REI-S API changed:**
```bash
cd services/reis
uv run python rei_s/generate_open_api.py  # Generate reis-dev-spec.json

cd ../../backend
npm run generate-reis           # Generate TypeScript client
```

**Requirements**: Java Runtime Environment (JRE) must be installed for OpenAPI Generator.

## Architecture Details

### Domain-Driven Design Structure

The backend follows NestJS's modular architecture with domain-driven design:

**Core Domains** (`backend/src/domain/`):
- `auth/`: Authentication and authorization (OAuth2, local auth, user groups)
- `chat/`: Conversation management and LLM interaction orchestration
- `extensions/`: Extension system (models, tools, RAG configurations)
- `files/`: File management and integration with REI-S
- `users/`: User management and permissions
- `settings/`: Application configuration
- `database/`: TypeORM entities and database configuration

**Extension System** (`backend/src/extensions/`):
- `models/`: LLM provider implementations (OpenAI, Azure, Bedrock, Ollama, Google, etc.)
- `tools/`: Tool extensions (MCP servers, Bing Search, Calculator)
- `other/`: System prompt and other extensions

### Key Architectural Concepts

**Assistants and Extensions**: The application revolves around "assistants" (chatbots). Each assistant is composed of multiple "extensions" that define:
- Which LLM model to use (OpenAI, Azure, Bedrock, Ollama, Google, etc.)
- Which tools are available (MCP servers, search, calculator, file search)
- Custom system prompts
- RAG capabilities (via REI-S integration)

**Extension Types**:
- **Model Extensions**: Connect to LLM providers (required for each assistant)
- **Tool Extensions**: Add capabilities like MCP servers, web search, calculations
- **RAG Extensions**: Enable file search via REI-S vector stores (pgvector, Azure AI Search)
- **System Prompt Extensions**: Customize assistant behavior

**Chat Flow**:
1. User sends message via Frontend
2. Backend receives request and loads assistant configuration
3. Backend orchestrates LLM calls using configured model extension
4. If RAG enabled, Backend queries REI-S for relevant file content
5. If tools enabled, Backend provides tools to LLM and executes tool calls
6. Backend streams response back to Frontend

**Authentication**: Supports multiple auth providers:
- Local authentication (email/password)
- OAuth2 (Google, Microsoft, GitHub)
- Custom OAuth2 providers
- User group-based permissions (multiple groups per user)

### Database Migrations

The backend uses TypeORM for database management:

```bash
cd backend

# Run pending migrations
npm run migration:run

# Generate new migration from entity changes
npm run migration:generate --name=MigrationName

# Create empty migration
npm run migration:create --name=MigrationName

# Revert last migration
npm run migration:revert

# Check pending migrations (dry run)
npm run migration:generate:dryrun
```

**Important**: Always review generated migrations before committing. The `migration:generate` command automatically formats the output with Prettier.

### REI-S (RAG Server)

The REI-S service (`services/reis/`) provides RAG capabilities:
- **File Processing**: Supports PDF, DOCX, PPTX, XLSX, audio (Whisper transcription), etc.
- **Embedding Models**: OpenAI, Azure OpenAI, Ollama, AWS Bedrock, NVIDIA
- **Vector Stores**: pgvector (PostgreSQL), Azure AI Search
- **Chunking and Indexing**: Configurable chunking strategies for optimal retrieval

Configuration is managed via environment variables in `services/reis/.env`. See `services/reis/README.md` for detailed setup instructions.

**Package Management**: REI-S uses `uv` for fast Python dependency management.

## Commit Message Convention

Follow conventional commits with specific scopes:

**Format**: `<type>(<scope>): <subject>`

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `build`, `perf`

**Scopes**:
- `frontend`: Changes in `/frontend`
- `backend`: Changes in `/backend`
- `reis`: Changes in `/services/reis`
- Multiple scopes: `frontend,backend`

**Example**:
```
feat(backend): add support for Anthropic Claude models
fix(frontend): resolve chat scroll issue on mobile
docs(reis): update vector store configuration guide
```

Commit messages are used to generate release notes, so clear, descriptive messages are important.

## Testing Strategy

**Unit Tests**:
- Frontend: Vitest with React Testing Library
- Backend: Jest with NestJS testing utilities
- REI-S: pytest with fixtures and mocks

**E2E Tests**:
- Playwright tests in `/e2e` directory
- Tests organized by feature: `tests/administration/`, `tests/chat/`, etc.
- `extension-tests/`: Tests for specific extension types (LLM providers, MCP servers)
- `expensive-tests/`: Tests requiring large files or external services

**Test Organization**:
- Extension tests can be skipped: `--withoutExtensionTests`
- Expensive tests can be skipped: `--withoutExpensiveTests`
- Normal tests can be skipped: `--withoutNormalTests`

## Common Development Workflows

### Adding a New LLM Provider

1. Create extension implementation in `backend/src/extensions/models/`
2. Follow existing patterns (see `open-ai.ts`, `azure-open-ai.ts`)
3. Register extension in `backend/src/extensions/module.ts`
4. Add tests following `model-test.base.ts` pattern
5. Update documentation if needed

### Adding a New Tool Extension

1. Create tool implementation in `backend/src/extensions/tools/`
2. Define OpenAPI spec in `backend/src/openapi/tools-spec.json`
3. Regenerate tool clients: `cd backend && npm run generate-tools`
4. Register tool in extension system
5. Add E2E tests in `e2e/extension-tests/`

### Creating a New Assistant

1. Navigate to Admin Area (click username bottom left)
2. Go to Assistants section
3. Click green `+` button
4. Add Model Extension (required)
5. Add Tool Extensions (optional)
6. Add RAG Extension (optional, requires REI-S setup)
7. Test configuration with `Test` button
8. Save and use in chat

## Docker and Deployment

**Development**: Docker Compose manages PostgreSQL and optional Ollama service.

**Production**: Helm chart available in `/helm-chart` for Kubernetes deployments. See `helm-chart/README.md` for deployment instructions.

## Prerequisites

- **Node.js**: Version specified in `.nvmrc` (use `nvm install`)
- **Python**: Version in `.python-version` (Python ≥3.12.0)
- **uv**: ≥0.5.0 for REI-S dependencies ([installation guide](https://docs.astral.sh/uv/getting-started/installation/))
- **PostgreSQL**: Managed via Docker Compose
- **JRE**: Required for OpenAPI Generator (API regeneration only)
- **Git LFS**: Optional, for running tests with large files

## Project-Specific Notes

- **Line Endings**: For Windows users, configure Git: `git config --global core.autocrlf input`
- **Port Conflicts**: Use `npm run dev:force` to reuse running services
- **Log Monitoring**: Use `tail -f ./output/*.log` to watch all service logs simultaneously
- **Schema Management**: Backend uses PostgreSQL schema for multi-tenancy isolation
- **Observability**: OpenTelemetry and Prometheus metrics are built-in
- **Internationalization**: Backend supports i18n via `nestjs-i18n` (localization files in `backend/src/localization/`)
