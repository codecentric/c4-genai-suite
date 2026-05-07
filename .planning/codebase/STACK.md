# Technology Stack

**Analysis Date:** 2026-05-07

## Languages

**Primary:**
- TypeScript 5.9.3 - Frontend and Backend (NestJS)
- Python 3.13.2 - REI-S service (FastAPI-based RAG server)
- JavaScript/Node.js 24 - Build tooling and scripts

**Secondary:**
- SQL (PostgreSQL-specific dialects) - Database migrations and queries
- YAML - Configuration files (docker-compose, pre-commit)

## Runtime

**Environment:**
- Node.js 24 (specified in `.nvmrc`)
- Python >=3.12 <4.0 (managed via `uv`, see `.python-version`)
- PostgreSQL 16 with pgvector extension (Docker image: `pgvector/pgvector:pg16`)

**Package Manager:**
- npm - JavaScript/TypeScript dependencies (monorepo root, frontend, backend, e2e)
- uv - Python package management for REI-S service
- Lockfiles: `package-lock.json` (npm), `uv.lock` (Python)

## Frameworks

**Core:**
- NestJS 11.1.19 - Backend API framework with TypeORM integration
- React 19.2.5 - Frontend UI library
- FastAPI 0.136.1 - REI-S service framework (Python)

**State Management & Data:**
- Zustand 5.0.12 - Frontend state management
- TanStack Query 5.95.2 - Frontend server state (formerly React Query)
- TypeORM 0.3.28 - Backend ORM for PostgreSQL
- pgvector (via TypeORM) - Vector storage in PostgreSQL

**UI & Styling:**
- Mantine UI 9.1.0 - Component library (core, dates, dropzone, form, hooks)
- Tailwind CSS 4.1.18 - Utility-first CSS framework
- Recharts 3.8.1 - React charting library
- React Router DOM 7.13.2 - Frontend routing
- React Markdown 10.0.0 - Markdown rendering
- React PDF 10.3.0 - PDF viewing

**Testing:**
- Jest 30.3.0 - Backend unit tests (with ts-jest for TypeScript)
- Vitest 4.1.4 - Frontend unit tests (coverage via @vitest/coverage-v8)
- Playwright - E2E tests (Chromium, Firefox, WebKit)
- Testcontainers - Docker-based test databases (PostgreSQL)
- @testing-library/react 16.3.2 - React component testing utilities

**Build/Dev:**
- Vite 8.0.8 - Frontend dev server and bundler
- TypeScript 5.9.3 - Type system for JS/TS
- ESLint 9.39.2 - JavaScript/TypeScript linting
- Prettier 3.8.3 - Code formatting
- Ruff 0.15.12 - Python linting and formatting (used in pre-commit)
- OpenAPI Generator CLI 2.31.1 - Auto-generate API clients from specs

## Key Dependencies

**Critical Infrastructure:**
- pg 8.20.0 - PostgreSQL client for Node.js
- psycopg[binary] >=3.3.4 - PostgreSQL client for Python
- LangChain ecosystem:
  - langchain-core >=1.3.3
  - langchain-community >=0.4.1
  - langchain-openai >=1.2.1
  - langchain-postgres >=0.0.16 - Vector store integration
  - langchain-ollama >=0.3.10
  - langchain-aws >=1.4.6
  - langchain-nvidia-ai-endpoints >=0.3.19

**AI/LLM Integrations:**
- ai SDK 6.0.168 - Vercel AI SDK (unified LLM provider interface)
- @ai-sdk/openai 3.0.7 - OpenAI integration
- @ai-sdk/azure 3.0.54 - Azure OpenAI integration
- @ai-sdk/google 3.0.64 - Google Generative AI
- @ai-sdk/google-vertex 4.0.112 - Google Vertex AI
- @ai-sdk/amazon-bedrock 4.0.96 - AWS Bedrock
- @ai-sdk/mistral 3.0.30 - Mistral AI
- @ai-sdk/openai-compatible 2.0.37 - Generic OpenAI-compatible endpoints
- openai 6.18.0 - OpenAI SDK (direct)
- ollama-ai-provider-v2 3.5.0 - Ollama integration
- @azure/ai-agents 1.1.0 - Azure AI agents SDK

**Authentication:**
- passport 1.0.2 - Authentication middleware
- passport-github2 0.1.12 - GitHub OAuth
- passport-google-oauth2 0.2.0 - Google OAuth
- passport-microsoft 2.1.0 - Microsoft/Entra OAuth
- passport-oauth2 1.8.0 - Generic OAuth 2.0
- passport-custom 1.1.1 - Custom strategy support
- express-session 1.19.0 - Session management
- cookie-parser 1.4.7 - HTTP cookie parsing
- bcrypt 6.0.0 - Password hashing

**File Processing:**
- pdfminer-six >=20260107 - PDF extraction (Python)
- pypdf >=6.10.2 - PDF manipulation (Python)
- ffmpeg-python >=0.2.0 - Audio/video processing
- weasyprint >=67.0 - HTML to PDF conversion (Python)
- react-pdf 10.3.0 - PDF rendering in React
- react-dropzone 14.3.5 - File upload handling

**Model Context Protocol:**
- @modelcontextprotocol/sdk 1.27.1 - MCP client implementation
- fastmcp >=3.2.4 - FastAPI MCP server (Python)

**Cloud & Storage:**
- boto3 >=1.43.0 - AWS SDK (Python)
- boto3-stubs[s3] >=1.43.3 - Type stubs for boto3
- @azure/identity 4.13.1 - Azure authentication
- @azure/core-util 1.13.1 - Azure utilities
- azure-search-documents 11.6.0 - Azure AI Search client
- azure-identity 1.25.3 - Azure identity (Python)

**Monitoring & Observability:**
- @opentelemetry/sdk-node 0.214.0 - OpenTelemetry NodeJS SDK
- @opentelemetry/auto-instrumentations-node 0.72.0 - Auto-instrumentation
- langfuse-vercel 3.38.20 - Langfuse trace exporter
- prometheus-fastapi-instrumentator >=7.0.0 - Prometheus metrics (FastAPI)
- @willsoto/nestjs-prometheus 6.0.2 - Prometheus client (NestJS)
- prom-client 15.1.3 - Prometheus client library
- winston 3.19.0 - Logging (Node.js)
- nest-winston 1.10.2 - Winston integration for NestJS

**Utilities:**
- RxJS 7.8.2 - Reactive programming
- zod 4.3.6 - TypeScript-first schema validation
- class-validator 0.15.1 - Decorator-based validation
- class-transformer 0.5.1 - Object transformation/serialization
- date-fns 4.1.0 - Date utility library
- i18next 25.8.18 - Internationalization (Node.js)
- react-i18next 16.5.8 - i18n for React
- nunjucks 3.2.4 - Templating engine
- undici 8.1.0 - HTTP client
- dotenv 17.4.2 - Environment variable loading
- uuid 11.1.0 - UUID generation

**Development Dependencies:**
- husky 9.1.7 - Git hooks
- lint-staged 15.5.2 - Pre-commit linting
- @nestjs/cli 11.0.21 - NestJS CLI
- @nestjs/testing 11.1.19 - NestJS testing utilities
- supertest 7.2.2 - HTTP testing
- jest-junit 16.0.0 - JUnit test reporting
- ts-node 10.9.2 - TypeScript execution
- source-map-support 0.5.21 - Stack trace mapping
- detect-port 2.1.0 - Port availability detection
- tree-kill 1.2.2 - Process tree termination

## Configuration

**Environment:**
- Environment variables loaded via `dotenv` (`.env` files)
- Backend uses `@nestjs/config` (ConfigService pattern)
- REI-S uses `pydantic-settings` for configuration

**Key Configuration Files:**
- `.nvmrc` - Node.js version (24)
- `.python-version` - Python version (3.13.2)
- `docker-compose.yml` - Local development stack (PostgreSQL, Ollama, MinIO, Caddy)
- `package.json` - NPM workspaces root configuration
- `tsconfig.json` - TypeScript configuration (root, frontend, backend, e2e)
- `.eslintrc.*` - ESLint configuration
- `.prettierrc` - Prettier formatting rules
- `jest.config.ts` - Jest test configuration (backend)
- `vite.config.ts` - Vite build configuration (frontend)
- `.pre-commit-config.yaml` - Pre-commit hooks (lint-staged, ruff)
- `pyproject.toml` - Python project metadata and dependencies

**Build:**
- Frontend: `npm run build` → Vite TypeScript compilation + bundling
- Backend: `npm run build` → TypeScript compilation to `dist/`
- REI-S: No explicit build (pure Python, runs via uvicorn)

## Platform Requirements

**Development:**
- macOS, Linux, or Windows with WSL2
- Node.js 24 (via nvm or direct install)
- Python 3.13.2 (via pyenv or uv)
- Docker & Docker Compose (for PostgreSQL, Ollama, MinIO, Redis simulation)
- Git with husky hooks

**Production:**
- PostgreSQL 16+ with pgvector extension
- Node.js 24 runtime (backend)
- Python 3.12+ runtime (REI-S)
- Optional: Redis (for session caching, not currently in docker-compose)
- Optional: S3-compatible storage (MinIO or AWS S3)
- Optional: Ollama instance or external LLM APIs

**Optional External Services:**
- OpenAI API
- Azure OpenAI Service
- Google Generative AI / Vertex AI
- AWS Bedrock
- Mistral AI
- Ollama (self-hosted or Docker)
- Azure AI Search (vector database alternative)
- Azure Cognitive Services (speech, transcription)
- GitHub OAuth
- Google OAuth
- Microsoft Entra ID (OAuth)
- Langfuse (tracing & monitoring)

---

*Stack analysis: 2026-05-07*
