<!-- refreshed: 2026-05-07 -->
# Architecture

**Analysis Date:** 2026-05-07

## System Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (React 19 + Vite)                │
│        `frontend/src/` - ChatPage, AdminPage, LoginPage         │
├─────────────────────────────────────────────────────────────────┤
│   API Layer           │  State Management      │  Components     │
│  `api/generated/`     │  `api/state/zustand`   │  `components/`  │
│  (OpenAPI client)     │  (Zustand stores)      │  (UI + routing) │
└─────────────────────┬───────────────────────┬──────────────────┘
                      │ HTTP REST              │
                      ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│          Backend (NestJS + TypeORM + CQRS)                      │
│        `backend/src/` - API, Extensions, Chat Processing        │
├─────────────────────────────────────────────────────────────────┤
│ Controllers          │  Domain Modules         │  Extensions     │
│ `controllers/`       │  `domain/chat`          │  Models, Tools  │
│ (REST endpoints)     │  `domain/extensions`    │  `extensions/`  │
│                      │  `domain/auth`          │                 │
│                      │  `domain/users`         │                 │
│                      │  `domain/database`      │                 │
└─────────────────────┬───────────────────────┬──────────────────┘
                      │ SQL (TypeORM)          │ HTTP to REI-S
                      │ pgvector               │
                      ▼                        ▼
┌──────────────────────────────┐  ┌────────────────────────────────┐
│    PostgreSQL Database       │  │  REI-S (Python FastAPI RAG)    │
│  - Conversations             │  │  `services/reis/rei_s/`        │
│  - Messages                  │  │  - File indexing & RAG         │
│  - Users, Configurations     │  │  - Vectorstore integration     │
│  - Extensions, Settings      │  │  - Format providers            │
│                              │  │  - Search functionality        │
└──────────────────────────────┘  └────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| ChatPage | Main chat UI, message rendering, streaming | `frontend/src/pages/chat/ChatPage.tsx` |
| AdminPage | Configuration management, user/group admin | `frontend/src/pages/admin/AdminPage.tsx` |
| ConversationsController | Conversation CRUD, message send/retrieve | `backend/src/controllers/conversations/` |
| ChatModule | Chat pipeline, middleware orchestration | `backend/src/domain/chat/` |
| ExtensionModule | Extension registry, configuration | `backend/src/domain/extensions/` |
| AuthModule | Authentication, user sessions | `backend/src/domain/auth/` |
| REI-S | Document indexing, RAG, vector search | `services/reis/rei_s/` |

## Pattern Overview

**Overall:** Layered architecture with Domain-Driven Design (DDD) and CQRS in backend; React query client pattern in frontend.

**Key Characteristics:**
- **Extension System**: Pluggable architecture where models, tools, and other capabilities are extensions implementing `Extension` interface
- **Middleware Chain Pipeline**: Chat processing uses ordered middleware pattern for composable LLM operations
- **CQRS**: Commands and Queries separated in backend (`CommandBus`, `QueryBus`); use-cases act as handlers
- **OpenAPI Contract-First**: TypeScript/Python client code auto-generated from backend/REI-S specs
- **Monorepo**: Backend, Frontend, and REI-S as separate npm/python packages managed together

## Layers

**Presentation (Frontend):**
- Purpose: User-facing chat interface and admin controls
- Location: `frontend/src/`
- Contains: React components, pages, UI state (Zustand)
- Depends on: Auto-generated API client (`frontend/src/api/generated/`)
- Used by: Browser clients

**API Gateway / Controllers (Backend):**
- Purpose: HTTP request handling, input validation, response serialization
- Location: `backend/src/controllers/`
- Contains: NestJS controllers for conversations, auth, extensions, users, etc.
- Depends on: Domain modules via CQRS bus
- Used by: Frontend, external API clients

**Domain / Business Logic (Backend):**
- Purpose: Core business rules, chat orchestration, extension management
- Location: `backend/src/domain/`
- Contains: Chat module (with middlewares), extension registry, auth, database entities, use-cases
- Depends on: Database layer, lib utilities
- Used by: Controllers, use-cases call each other via CQRS bus

**Data Persistence (Backend):**
- Purpose: ORM mappings, database schema, repositories
- Location: `backend/src/domain/database/` and `backend/src/migrations/`
- Contains: TypeORM entities, migrations, custom repositories
- Depends on: PostgreSQL connection config
- Used by: Domain modules for querying

**Extension Library (Backend):**
- Purpose: Implementations of LLM models, tools, other capabilities
- Location: `backend/src/extensions/`
- Contains: Model implementations (OpenAI, Azure, Bedrock, Ollama, etc.), tool implementations, examples
- Depends on: ai-sdk, extension interfaces from domain
- Used by: Extension module to load registered extensions

**RAG Service (REI-S):**
- Purpose: Document indexing, embedding, vector search
- Location: `services/reis/rei_s/`
- Contains: FastAPI routes, vectorstore adapters, file processors, embedding providers
- Depends on: LangChain, pgvector, external embedding services
- Used by: Backend for RAG queries

## Data Flow

### Primary Request Path (Chat Message)

1. **Frontend sends message** (`frontend/src/pages/chat/ChatPage.tsx:line ~200`)
   - User submits text or files
   - Call `SendMessage` query via TanStack Query hook

2. **Controller receives request** (`backend/src/controllers/conversations/conversations.controller.ts:line ~80`)
   - `ConversationsController.sendMessage()` validates input
   - Executes `SendMessage` query through `QueryBus`

3. **Use-case executes** (`backend/src/domain/chat/use-cases/send-message.ts:line ~65`)
   - `SendMessageHandler` loads conversation, extension config, user
   - Builds chat context with tools, models, history
   - Invokes middleware chain

4. **Middleware chain processes** (`backend/src/domain/chat/middlewares/`)
   - Each middleware invokes next in order:
     - `CheckUsageMiddleware` - validates user quota
     - `ChooseLllMiddleware` - selects LLM based on assistant config
     - `GetUserMiddleware` - loads user details
     - `GetHistoryMiddleware` - retrieves previous messages from DB
     - `RenderPromptMiddleware` - applies system prompt + history template
     - `ExecuteMiddleware` - calls ai-sdk to invoke LLM
     - `StorageUsageMiddleware` - records token usage
     - `UIMiddleware` - handles interactive form requests
     - `ExceptionMiddleware` - catches errors

5. **LLM execution** (ai-sdk via `ExecuteMiddleware`)
   - Streams response chunks or generates complete text
   - Tools attached via extensions become available to model
   - Emits `StreamEvent` objects (chunks, tokens, tool calls, errors)

6. **Response streams to frontend** (RxJS Observable)
   - WebSocket or Server-Sent Events stream
   - Frontend receives `StreamTokenEvent`, `StreamToolStartEvent`, etc.
   - UI updates in real-time

7. **Message persisted** (`backend/src/domain/database/entities/message.ts`)
   - After streaming completes, message saved to PostgreSQL
   - `StreamMessageSavedEvent` indicates persistence

### Extension Resolution Flow

1. Administrator creates configuration in admin UI
   - Selects extensions (models + tools) for an assistant
   - Provides configuration values

2. Configuration stored in DB (`ConfigurationEntity`)

3. When chat starts:
   - `GetConfiguration` query loads config
   - `GetExtensions` query loads all extension instances
   - `ConfiguredExtension.create()` instantiates each with its spec
   - Extensions provide middlewares via `getMiddlewares()`

4. Middlewares added to chain in order

### Document Indexing (REI-S)

1. User uploads file via frontend file uploader
2. File stored in MinIO or local filesystem
3. REI-S processes file:
   - Route `/files/upload` receives file
   - Format provider selected based on MIME type (PDF, Word, Excel, HTML, etc.)
   - Content extracted and chunked
   - Embeddings generated (via provider: OpenAI, Azure, local)
   - Chunks stored in pgvector (PostgreSQL) or Qdrant
4. Frontend displays sources in chat when tool references them

## Key Abstractions

**Extension:**
- Purpose: Pluggable capability (model provider, tool, or other)
- Examples: `OpenAIExtension`, `AzureExtension`, `AlwaysAnswerWith42Tool`
- Pattern: Implement `Extension` interface with `spec` and `getMiddlewares()`; use `@Extension()` decorator

**ChatMiddleware:**
- Purpose: Composable step in message processing pipeline
- Examples: `ExecuteMiddleware`, `RenderPromptMiddleware`, `CheckUsageMiddleware`
- Pattern: Implement `invoke(context, getContext, next)` method; call `next()` to continue chain

**ConfiguredExtension:**
- Purpose: Runtime representation of an enabled extension in a configuration
- Pattern: Wraps `Extension` class + entity + spec; provides `getMiddlewares()` and other methods

**ChatContext:**
- Purpose: State passed through middleware chain
- Contains: user, conversation, input, tools, llms, history, cache, ui callback handler
- Pattern: Mutable object that middlewares enrich (add tools, set llm, populate results)

**Message History:**
- Purpose: Abstract storage of chat messages
- Implemented by: Database-backed `MessageRepository`
- Pattern: Supports `getMessages()`, `addMessage()`, `addSources()`

## Entry Points

**Frontend:**
- Location: `frontend/src/main.tsx`
- Triggers: Browser page load
- Responsibilities: Render `App` component with routing, providers (QueryClient, i18n, Theme)

**Backend:**
- Location: `backend/src/main.ts`
- Triggers: `npm run dev` or container startup
- Responsibilities: Bootstrap NestJS app, configure session/cookies/swagger, listen on port 3000, start Prometheus exporter on port 9100

**REI-S:**
- Location: `services/reis/rei_s/app.py`
- Triggers: `python -m uvicorn rei_s.app:app`
- Responsibilities: Create FastAPI app, register routes (files, health), start Prometheus server

## Architectural Constraints

- **Threading:** Backend is single-threaded event-driven (NestJS default); REI-S is async-IO with uvicorn workers. Chat processing uses RxJS for async composition.
- **Global state:** Backend uses CQRS bus as shared dependency injection; frontend uses Zustand singleton for app client. AsyncLocalStorage used in `SendMessageHandler` to manage context.
- **Circular imports:** Frontend guards against circular imports via barrel files (`index.ts`). Backend domain modules may have limited circular dependencies via `forwardRef` (e.g., QueryBus in SendMessageHandler).
- **Message streaming:** Chat responses are streamed as `Observable<StreamEvent>`. Clients (frontend) must unsubscribe on abort or component unmount to prevent memory leaks.
- **Extension loading:** Extensions loaded at boot via `ExtensionLibraryModule`. Dynamic specs can be rebuilt at runtime. Incompatibility groups prevent conflicting extensions in same config.

## Anti-Patterns

### Direct Entity Exposure

**What happens:** Controllers or use-cases expose TypeORM entities directly in responses instead of DTOs.
**Why it's wrong:** Entities may contain sensitive fields, internal relationships, or exceed API contract.
**Do this instead:** Use DTOs (`backend/src/controllers/*/dtos/`) as response types. Map entities to DTOs in controller or use-case before returning.

### Unchecked Extension Configuration

**What happens:** Code assumes extension config exists without validation.
**Why it's wrong:** Missing or misconfigured values cause runtime errors during chat.
**Do this instead:** Use `ExtensionSpec.arguments` to validate; use type-safe config access in middleware.

### Blocking I/O in Middleware

**What happens:** Middleware performs synchronous DB queries or external API calls.
**Why it's wrong:** Blocks async chain, reduces concurrency.
**Do this instead:** All middleware is async. Use CQRS bus (`this.queryBus.execute()`) for queries.

### Frontend State Duplication

**What happens:** Zustand store + React state + TanStack Query cache each hold same data.
**Why it's wrong:** Sync issues, stale data, increased memory.
**Do this instead:** Use Zustand for app-level state (theme, auth token). Use TanStack Query for server state. Keep React state for transient UI-only state.

### Hardcoded User/Conversation IDs

**What happens:** Middleware or use-case assumes specific user from context.
**Why it's wrong:** Multi-tenant bugs, privilege escalation if context not validated.
**Do this instead:** Always extract user from request context (`req.user`) and pass through domain layer. Verify user owns conversation before allowing access.

## Error Handling

**Strategy:** Layered error handling with user-facing `ChatError` vs internal errors.

**Patterns:**
- `ChatError` (extends Error): User-facing error message; caught by `ExceptionMiddleware` and sent to frontend as `StreamErrorEvent`
- Internal errors (NestJS `BadRequestException`, `NotFoundException`): Caught by NestJS exception filters; logged and returned as HTTP error
- Middleware errors: If non-recoverable, throw `ChatError`; if recoverable, emit `StreamLoggingEvent` and continue
- Frontend: Catches `StreamErrorEvent` from chat stream and displays toast notification

## Cross-Cutting Concerns

**Logging:** Backend uses NestJS logger (logs to console and `./output/` directory during `npm run dev`). REI-S uses Python logging via `logging.conf`. Frontend uses console only.

**Validation:** Backend uses `class-validator` decorators on DTOs; NestJS `ValidationPipe` validates at controller boundary. REI-S uses Pydantic models.

**Authentication:** Backend uses session-based auth with `LocalAuthGuard` for most endpoints. API key auth via `ApiKeyAuthGuard`. Frontend stores session cookie; middleware intercepts 401 and redirects to login.

**Telemetry:** OpenTelemetry (optional) via `OpenTelemetryModule`. Prometheus metrics on `/metrics` port 9100. REI-S exposes Prometheus on separate port. Frontend sends no telemetry by default.

---

*Architecture analysis: 2026-05-07*
