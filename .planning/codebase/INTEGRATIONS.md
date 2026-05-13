# External Integrations

**Analysis Date:** 2026-05-07

## APIs & External Services

**LLM Providers:**
- OpenAI (GPT-4, GPT-3.5, DALL-E)
  - SDK: `openai` 6.18.0, `@ai-sdk/openai` 3.0.7
  - Auth: `OPENAI_API_KEY` (environment variable)
  - Implementation: `backend/src/extensions/models/open-ai.ts`

- Azure OpenAI Service
  - SDK: `@ai-sdk/azure` 3.0.54, `openai` (AzureOpenAI client)
  - Auth: Azure credentials via `@azure/identity`
  - Implementation: `backend/src/extensions/models/azure-open-ai.ts`
  - Tools: DALL-E image generation (`backend/src/extensions/tools/azure-dall-e.ts`), GPT image generation (`backend/src/extensions/tools/azure-gpt-image-1.ts`)
  - Services: Speech transcription, Azure AI Search for RAG
  - Files: `backend/src/extensions/other/azure-transcribe.ts`

- Google Generative AI / Vertex AI
  - SDK: `@ai-sdk/google` 3.0.64, `@ai-sdk/google-vertex` 4.0.112
  - Auth: API key or OAuth (via `@azure/identity` for Vertex)
  - Implementation: `backend/src/extensions/models/google-genai.ts`
  - Image generation: `backend/src/extensions/tools/gemini-image.ts`

- AWS Bedrock
  - SDK: `@ai-sdk/amazon-bedrock` 4.0.96
  - Auth: AWS credentials (access key + secret key)
  - Implementation: `backend/src/extensions/models/bedrock.ts`

- Mistral AI
  - SDK: `@ai-sdk/mistral` 3.0.30
  - Auth: `MISTRAL_API_KEY`
  - Implementation: `backend/src/extensions/models/mistral.ts`

- Ollama (Self-hosted)
  - SDK: `ollama-ai-provider-v2` 3.5.0
  - Connection: HTTP endpoint (default: `http://localhost:11434`)
  - Auth: None required (local service)
  - Implementation: `backend/src/extensions/models/ollama.ts`

- OpenAI-Compatible Endpoints
  - SDK: `@ai-sdk/openai-compatible` 2.0.37
  - Auth: API key (provider-specific)
  - Implementation: `backend/src/extensions/models/open-ai-compatible.ts`
  - Supports custom endpoints and providers

**Embeddings Providers (REI-S):**
- OpenAI Embeddings
  - Client: `langchain-openai.OpenAIEmbeddings`
  - Config env vars: `EMBEDDINGS_OPENAI_API_KEY`, `EMBEDDINGS_OPENAI_MODEL_NAME`
  - File: `services/reis/rei_s/services/embeddings_provider.py`

- Azure OpenAI Embeddings
  - Client: `langchain-openai.AzureOpenAIEmbeddings`
  - Config env vars: `EMBEDDINGS_AZURE_OPENAI_ENDPOINT`, `EMBEDDINGS_AZURE_OPENAI_API_KEY`, `EMBEDDINGS_AZURE_OPENAI_DEPLOYMENT_NAME`

- Ollama Embeddings
  - Client: `langchain-ollama.OllamaEmbeddings`
  - Config env vars: `EMBEDDINGS_OLLAMA_ENDPOINT`, `EMBEDDINGS_OLLAMA_MODEL_NAME`

- AWS Bedrock Embeddings
  - Client: `langchain-aws.embeddings.bedrock.BedrockEmbeddings`
  - Config env vars: AWS credentials

- NVIDIA Embeddings
  - Client: `langchain_nvidia_ai_endpoints.NVIDIAEmbeddings`
  - Config env vars: `EMBEDDINGS_NVIDIA_MODEL`, `EMBEDDINGS_NVIDIA_BASE_URL`, `EMBEDDINGS_NVIDIA_API_KEY`

**Search & Web APIs:**
- Bing Web Search
  - Endpoint: `https://api.bing.microsoft.com/v7.0/search`
  - Auth: Bing Search API key
  - Implementation: `backend/src/extensions/tools/bing-web-search.ts`
  - Use case: Web search results in chat

- DuckDuckGo Web Search
  - SDK: `duck-duck-scrape` 2.2.7
  - Implementation: `backend/src/extensions/tools/duckduckgo-web-search.ts`
  - Auth: None (public API)

- Azure AI Search (Grounding)
  - SDK: `@azure/ai-agents`, `azure-search-documents` 11.6.0
  - Auth: Azure credentials via `@azure/identity`
  - Implementation: `backend/src/extensions/tools/grounding-with-bing.ts`
  - Use case: Enterprise search with Bing grounding

## Data Storage

**Databases:**
- PostgreSQL 16
  - Connection: `DB_URL` environment variable (format: `postgres://user:pass@host:port/dbname`)
  - Client: TypeORM 0.3.28 (Node.js), psycopg 3.3.4+ (Python)
  - Schema: `company_chat` (custom TypeORM schema)
  - Migrations: Auto-managed via TypeORM with `migration:run` command
  - Extensions: pgvector (for vector embeddings)
  - Location: `backend/src/domain/database/` (entities and repositories)

**Vector Store (REI-S):**
- pgvector (PostgreSQL extension)
  - Storage in PostgreSQL using pgvector type
  - Client: `langchain-postgres.PostgresVectorStore`
  - Config env vars: `STORE_PGVECTOR_URL`, `STORE_PGVECTOR_INDEX_NAME`

- Azure AI Search (Alternative)
  - Service: Azure Cognitive Search
  - Client: `azure-search-documents` 11.6.0
  - Config env vars: `STORE_AZURE_AI_SEARCH_SERVICE_ENDPOINT`, `STORE_AZURE_AI_SEARCH_SERVICE_API_KEY`, `STORE_AZURE_AI_SEARCH_SERVICE_INDEX_NAME`
  - Selection: Via `STORE_TYPE` environment variable

**File Storage:**
- S3 (AWS S3 or S3-compatible, e.g., MinIO)
  - Bucket storage for uploaded documents and generated files
  - Client: `boto3` 1.43.0 (Python)
  - Config env vars: `FILE_STORE_S3_ENDPOINT_URL`, `FILE_STORE_S3_ACCESS_KEY_ID`, `FILE_STORE_S3_SECRET_ACCESS_KEY`, `FILE_STORE_S3_BUCKET_NAME`, `FILE_STORE_S3_REGION_NAME`
  - Type selection: `FILE_STORE_TYPE=s3`
  - Docker default: MinIO on `http://minio:9000`

- Filesystem
  - Local disk storage (for development)
  - Config env var: `FILE_STORE_FILESYSTEM_BASEPATH`
  - Type selection: `FILE_STORE_TYPE=filesystem`
  - Use case: Development-only alternative

**Caching:**
- None currently configured
- Note: Express sessions stored in-memory (backend/src/domain/auth/session-storage.ts)
- Potential: Redis (not in current stack but can be added)

## Authentication & Identity

**Auth Providers:**
- Local (Username/Password)
  - Implementation: `backend/src/domain/auth/strategies/local-strategy.ts`
  - Hash algorithm: bcrypt (6.0.0)
  - Config: `AUTH_ENABLE_PASSWORD` flag, `AUTH_INITIAL_ADMIN_USERNAME`, `AUTH_INITIAL_ADMIN_PASSWORD`

- GitHub OAuth 2.0
  - SDK: `passport-github2` 0.1.12
  - Endpoints: `/api/auth/login/github`, `/api/auth/login/github/callback`
  - Implementation: `backend/src/domain/auth/strategies/github-strategy.ts`
  - File: `backend/src/controllers/auth/auth.controller.ts`

- Google OAuth 2.0
  - SDK: `passport-google-oauth2` 0.2.0
  - Endpoints: `/api/auth/login/google`, `/api/auth/login/google/callback`
  - Implementation: `backend/src/domain/auth/strategies/google-strategy.ts`

- Microsoft Entra ID (Azure AD)
  - SDK: `passport-microsoft` 2.1.0
  - Endpoints: `/api/auth/login/microsoft`, `/api/auth/login/microsoft/callback`
  - Implementation: `backend/src/domain/auth/strategies/microsoft-strategy.ts`

- Generic OAuth 2.0
  - SDK: `passport-oauth2` 1.8.0, `passport-custom` 1.1.1
  - Endpoints: `/api/auth/login/oauth`, `/api/auth/login/oauth/callback`
  - Implementation: `backend/src/domain/auth/strategies/oauth-strategy.ts`
  - Config: `AUTH_OAUTH_AUTHORIZATION_URL`, `AUTH_OAUTH_TOKEN_URL`, `AUTH_OAUTH_USER_INFO_URL`, `AUTH_OAUTH_CLIENTID`, `AUTH_OAUTH_CLIENTSECRET`

**Session Management:**
- Express Session
  - Storage: In-memory (can be swapped for Redis)
  - Cookie: HTTP-only, secure flag enabled in production
  - Implementation: `backend/src/domain/auth/session-storage.ts`
  - Config: `SESSION_SECRET` environment variable

**Authorization:**
- Role-based access control (RBAC)
  - Roles: Admin, User
  - Implementation: `backend/src/domain/auth/role.guard.ts`, `backend/src/domain/auth/role.decorator.ts`
  - User groups enforced via `AUTH_LOGIN_ALLOWED_GROUPS` config

## Monitoring & Observability

**Error Tracking & Tracing:**
- Langfuse (Optional - Tracing & Observability)
  - Exporter: `langfuse-vercel` 3.38.20
  - OpenTelemetry integration: `@opentelemetry/sdk-node` 0.214.0
  - Config env vars: `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL` (default: `https://cloud.langfuse.com`)
  - Activation: Only enabled if all three env vars are set
  - Implementation: `backend/src/metrics/opentelemetry.module.ts`, `backend/src/domain/chat/middlewares/langfuse-middleware.ts`
  - Auto-instrumentation: Via `@opentelemetry/auto-instrumentations-node`

**Metrics & Dashboards:**
- Prometheus (Metrics Scraping)
  - Client: `prom-client` 15.1.3, `@willsoto/nestjs-prometheus` 6.0.2 (Backend)
  - FastAPI instrumentation: `prometheus-fastapi-instrumentator` 7.0.0 (REI-S)
  - Endpoint: `/metrics` (Prometheus format)
  - Port: Configurable via `METRICS_PORT` (Backend: 0 = disabled by default, REI-S: 9200)
  - Implementation: `backend/src/metrics/prometheus.module.ts`, `backend/src/metrics/metrics.service.ts`

**Logs:**
- Winston (Node.js Logging)
  - Logger: `winston` 3.19.0, `nest-winston` 1.10.2
  - Implementation: NestJS logger integration
  - Optional: Log RAG chunks via `LOG_RAG_CHUNKS` flag
  - Optional: Log LLM agent via `LOG_LLM_AGENT` flag

- Python Logging
  - REI-S: Via `logging` module (see `logging.conf`)
  - Level: Configurable

**Health Checks:**
- NestJS Terminus
  - Module: `@nestjs/terminus` 11.1.1
  - Endpoint: `/api/health` (Backend)
  - Health check: `rei_s/health` endpoint (REI-S)
  - Monitoring: Docker health checks on all services

## CI/CD & Deployment

**Hosting:**
- Docker containers (multi-service)
  - Frontend: `ghcr.io/codecentric/c4-genai-suite/frontend:latest`
  - Backend: `ghcr.io/codecentric/c4-genai-suite/backend:latest`
  - REI-S: `ghcr.io/codecentric/c4-genai-suite/reis:latest`
  - Orchestration: Docker Compose (for local dev)

**Deployment Platform:**
- Kubernetes-ready (Docker images)
- Self-hosted or cloud (AWS, Azure, GCP, etc.)

**CI/CD Pipeline:**
- GitHub Actions (implied by release-please workflows in git history)
- Pre-commit hooks: `lint-staged` (ESLint, Prettier), `ruff` (Python)

## Environment Configuration

**Required Environment Variables (Backend):**
- `DB_URL` - PostgreSQL connection string
- `AUTH_INITIAL_ADMIN_USERNAME` - Initial admin user
- `AUTH_INITIAL_ADMIN_PASSWORD` - Initial admin password
- `AUTH_ENABLE_PASSWORD` - Boolean to enable local auth
- `BASE_URL` - Frontend URL for OAuth redirects
- `SESSION_SECRET` - Session encryption key

**Optional Environment Variables (Backend):**
- `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL` - Tracing
- `METRICS_PORT` - Prometheus metrics port (default: 0, disabled)
- `LOG_RAG_CHUNKS`, `LOG_LLM_AGENT` - Debug logging
- `AUTH_BASEURL`, `AUTH_OAUTH_*` - Generic OAuth provider config
- `AUTH_LOGOUT_REDIRECT` - Post-logout redirect URL
- `AUTH_LOGIN_ALLOWED_GROUPS` - Group-based access control
- Cloud provider credentials (AWS, Azure, Google, etc.)

**Required Environment Variables (REI-S):**
- `EMBEDDINGS_TYPE` - Embeddings provider (ollama, openai, azure-openai, bedrock, etc.)
- `STORE_TYPE` - Vector store type (pgvector or azure-ai-search)
- Provider-specific credentials (see `.env.example` in services/reis)

**Required Environment Variables (Frontend):**
- `VITE_SERVER_URL` - Backend API URL for Vite proxy
- `OPENAPI_GENERATOR_CLI_SEARCH_URL` - Maven artifact search URL

**Secrets Location:**
- `.env` files (git-ignored, local development)
- Environment variables (Docker, Kubernetes, CI/CD)
- Azure Key Vault, AWS Secrets Manager (production)

## Webhooks & Callbacks

**Incoming:**
- OAuth Provider Callbacks
  - GitHub: `/api/auth/login/github/callback`
  - Google: `/api/auth/login/google/callback`
  - Microsoft: `/api/auth/login/microsoft/callback`
  - Generic OAuth: `/api/auth/login/oauth/callback`
  - All: POST/GET based on provider, handle session establishment

**Outgoing:**
- None detected in current codebase
- Potential: Future integration with external event systems

## API Specifications

**OpenAPI/Swagger:**
- Backend API spec: `backend-dev-spec.json` (auto-generated via `npm run generate-specs`)
- REI-S API spec: `reis-dev-spec.json` (auto-generated via Python script)
- Auto-generation command: `npm run generate-apis`
- Client generation: TypeScript fetch client for frontend, Python client for backend

**Client Codegen:**
- Frontend client: `src/api/generated/` (auto-generated, do not edit manually)
- Backend clients for REI-S: `src/domain/files/use-cases/generated/`
- Tools spec client: `src/extensions/tools/generated/`
- Executor spec client: `src/domain/chat/middlewares/generated/`

---

*Integration audit: 2026-05-07*
