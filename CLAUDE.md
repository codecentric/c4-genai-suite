# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

c4 GenAI Suite is an AI chatbot application with Model Context Protocol (MCP) integration. Administrators create assistants with different capabilities by adding extensions (RAG services, MCP servers, etc.). Built with React, NestJS, and Python FastAPI (REI-S service).

**Main components:**
- **Frontend** (`/frontend`): React 19 + TypeScript, Mantine UI, TailwindCSS, Vite
- **Backend** (`/backend`): NestJS + TypeScript, PostgreSQL + TypeORM
- **REI-S** (`/services/reis`): Python FastAPI RAG server (Retrieval Extraction Ingestion Server)

## Development Commands

### Initial Setup
```bash
# Install dependencies (run from repo root)
npm install

# Setup environment files
npm run env

# Start development environment
npm run dev
```

### Testing
```bash
# Run all tests
npm run test

# Run specific test suites
npm run test:frontend      # Frontend tests
npm run test:backend       # Backend tests
npm run test:reis          # REI-S tests (requires uv)
npm run test:e2e           # E2E tests

# E2E test variants
npm run test:e2e:ui        # With Playwright UI
npm run test:e2e:debug     # Debug mode
```

### Building
```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```

### Linting & Formatting
```bash
# Frontend/Backend
npm run lint
npm run lint:fix
npm run format

# REI-S
cd services/reis
uv run ruff check
uv run ruff format
```

### API Generation
After changing backend or REI-S APIs, regenerate OpenAPI specs and TypeScript clients:

```bash
# Regenerate all (from root)
npm run generate-apis

# Or individually:
npm run generate-specs-backend   # Generate backend OpenAPI spec
npm run generate-specs-reis      # Generate REI-S OpenAPI spec
npm run generate-clients-frontend # Generate frontend API client
npm run generate-clients-backend  # Generate backend API clients
```

### Database Migrations
```bash
cd backend

# Generate migration from entity changes
npm run migration:generate --name=MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## Architecture Overview

### Backend Architecture (NestJS)

**Domain-Driven Design with CQRS pattern:**
- `/backend/src/domain/` - Domain modules organized by bounded context
  - `auth/` - Authentication (OAuth2, password, API keys, session management)
  - `chat/` - Chat functionality with middleware pipeline
  - `extensions/` - Extension system management
  - `users/` - User management
  - `files/` - File upload/management
  - `database/` - TypeORM entities and repositories

**Key Pattern: Middleware Pipeline for Chat Processing**

Messages flow through an ordered chain of middlewares (`/backend/src/domain/chat/middlewares/`):

```
User Input → GetUser → GetHistory → CheckUsage → ChooseLLM →
Extension Middlewares → Execute → Complete → Stream Response
```

Critical middlewares:
- `GetUserMiddleware` - Retrieves user info
- `GetHistoryMiddleware` - Loads conversation history
- `ChooseLllMiddleware` - Selects the LLM to use
- `ExecuteMiddleware` - Orchestrates ai-sdk execution with streaming
- `CompleteMiddleware` - Finalizes the response

**CQRS Pattern:**
- Commands: Modify state (e.g., `StartConversation`, `DeleteConversation`)
- Queries: Read operations (e.g., `GetConversations`, `SendMessage`)
- Handlers in `/backend/src/domain/*/use-cases/`

### Extension System

**Location:** `/backend/src/extensions/`

Every extension implements:
```typescript
interface Extension<TConfig> {
  spec: ExtensionSpec;                    // Static metadata
  buildSpec?(): Promise<ExtensionSpec>;   // Dynamic specs (e.g., MCP)
  test?(config: TConfig): Promise<any>;   // Test configuration
  getMiddlewares(): Promise<ChatMiddleware[]>; // Add to chat pipeline
}
```

**Extension Types:**
- **models/** - LLM integrations (OpenAI, Azure OpenAI, Bedrock, Google GenAI, Ollama, Mistral, Nvidia)
- **tools/** - Tool extensions (MCP, RAG/Files, Web Search, Calculator, Image Generation)
- **other/** - Other extensions (Custom prompts, Speech-to-text, Summary)

**How Extensions Work:**
1. Extensions register in `/backend/src/extensions/module.ts`
2. Each extension provides middlewares that integrate into the chat pipeline
3. Model extensions provide `LanguageModelContext` with ai-sdk models
4. Tool extensions provide `NamedStructuredTool` instances (Zod schemas)
5. Dynamic extensions (like MCP) can generate their spec at runtime

**MCP Integration** (`/backend/src/extensions/tools/mcp-tools.ts`):
- Connects to Model Context Protocol servers via SSE or HTTP
- Dynamically discovers tools from MCP servers
- Converts MCP tool schemas to Zod schemas for ai-sdk
- Supports elicitation (requesting user input from tools)

### LLM Communication (ai-sdk)

**Core:** `/backend/src/domain/chat/middlewares/execute-middleware.ts`

All LLM interactions use Vercel's ai-sdk:
```typescript
import { streamText, tool } from 'ai';

const { fullStream } = streamText({
  model: llm.model,              // from ai-sdk providers
  tools: allTools,               // converted from NamedStructuredTool
  prompt: [...],                 // system + history + user input
  onFinish: ({ totalUsage }) => {...}  // track tokens
});
```

**Supported Providers:**
- Uses ai-sdk providers: `@ai-sdk/openai`, `@ai-sdk/azure`, `@ai-sdk/amazon-bedrock`, `@ai-sdk/google`, etc.
- Custom `ollama-ai-provider-v2` for Ollama support
- Each model extension creates an ai-sdk `LanguageModel` instance

**Tool Execution Flow:**
1. Extensions provide `NamedStructuredTool` with Zod schemas
2. `ExecuteMiddleware` converts them to ai-sdk `tool()` format
3. ai-sdk handles tool calling with the LLM
4. Tool results flow back through the stream

### Frontend Architecture (React)

**State Management:**
- **Zustand** (`/frontend/src/pages/chat/state/`): Client state
  - `chatStore` - Per-conversation messages, streaming state
  - `listOfChatsStore` - List of all conversations
  - `listOfAssistantsStore` - Available assistants
- **TanStack Query**: Server state, API caching, optimistic updates

**Key Pages** (`/frontend/src/pages/`):
- `chat/` - Main chat interface (3-panel layout: conversations, chat, files/sources)
- `admin/` - Admin configuration (assistants, extensions, users, dashboard)

**API Communication:**
- OpenAPI-generated client from backend spec (`/frontend/src/api/generated/`)
- Type-safe API calls with full TypeScript support
- SSE (Server-Sent Events) for streaming chat responses

### Database Schema

**Key Entities** (`/backend/src/domain/database/entities/`):
- **UserEntity** - Users with auth info
- **UserGroupEntity** - Role-based groups (Admin, Default)
- **ConfigurationEntity** - Assistant configurations
- **ExtensionEntity** - Extension instances with config
- **ConversationEntity** - Chat conversations
- **MessageEntity** - Individual messages
- **FileEntity** / **BucketEntity** - File storage

**Key Relationships:**
- Users ↔ UserGroups (many-to-many)
- Configurations → Extensions (one-to-many)
- Configurations ↔ UserGroups (many-to-many, for access control)
- Conversations → Configuration (many-to-one)

## Adding New Extensions

1. Create extension class implementing `Extension` interface in `/backend/src/extensions/`
2. Decorate with `@Extension()`
3. Register in `/backend/src/extensions/module.ts`
4. Extension automatically available in UI

Example structure:
```typescript
@Extension()
export class MyExtension implements Extension<MyExtensionConfig> {
  spec = { /* ... */ };

  async getMiddlewares() {
    return [new MyExtensionMiddleware()];
  }
}
```

## Git Workflow & Commit Guidelines

### Branch Naming
Create feature branches from `main`:
```bash
git checkout -b my-fix-branch main
```

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type** (required):
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding/updating tests
- `refactor`: Code refactoring (no bug fix or feature)
- `perf`: Performance improvements
- `style`: Code style/formatting (no logic change)
- `build`: Build system/dependency changes
- `ci`: CI configuration changes
- `chore`: Other changes (no production code change)

**Scope** (optional):
- `frontend`: Changes in `/frontend`
- `backend`: Changes in `/backend`
- `reis`: Changes in `/services/reis`
- Multiple scopes: `frontend,backend`

**Subject Rules:**
- Use imperative, present tense ("add" not "added" or "adds")
- Don't capitalize first letter
- No period at the end
- Max 100 characters per line

**Examples:**
```
feat(backend): add OAuth2 authentication support
fix(frontend): correct message streaming display issue
docs(reis): update RAG configuration guide
test(backend,frontend): add e2e tests for file upload
```

**Breaking Changes:**
Start footer with `BREAKING CHANGE:` and explain the change.

## Key Navigation Points

**Main Entry Points:**
- `/backend/src/main.ts` - Backend startup, middleware configuration
- `/backend/src/app.module.ts` - Main module registration
- `/frontend/src/App.tsx` - Frontend routing and providers
- `/frontend/src/pages/chat/ChatPage.tsx` - Main chat UI

**Extension System:**
- `/backend/src/extensions/module.ts` - Extension registry
- `/backend/src/domain/chat/module.ts` - Chat middleware setup

**API Contracts:**
- `/backend/backend-dev-spec.json` - Backend OpenAPI spec
- `/services/reis/reis-dev-spec.json` - REI-S OpenAPI spec
- `/frontend/src/api/generated/` - Generated TypeScript API clients

## Common Development Tasks

### Making API Changes

1. Update NestJS controllers/DTOs in backend or FastAPI routes in REI-S
2. Regenerate OpenAPI specs: `npm run generate-specs`
3. Regenerate TypeScript clients: `npm run generate-clients`
4. TypeScript types updated automatically across frontend/backend

### Debugging E2E Tests

Use VS Code with Playwright extension:
1. Press `CTRL+SHIFT+D` to open debug panel
2. Select `All-E2Es: Run with Playwright Debug` or `Current-E2E: Debug Currently Open Test File`
3. Set breakpoints and run

### Working with Large Test Files

Some tests use `git lfs` for large files:
```bash
# Install git lfs (if not already installed)
brew install git-lfs  # macOS
# or: apt install git-lfs  # Linux

# Pull large files
git lfs pull
```

## Prerequisites

- **Node.js**: Version as specified in `.nvmrc` (use `nvm install`)
- **Python & uv**: For REI-S (uv >= 0.5.0) - [installation guide](https://docs.astral.sh/uv/getting-started/installation/)
- **PostgreSQL**: Automatically configured via Docker Compose
- **JRE**: Required for OpenAPI Generator (when changing APIs)

## Testing Philosophy

All features or bug fixes must be tested:
- **Unit tests**: Test individual functions/classes
- **Integration tests**: Test component interactions
- **E2E tests**: Test full user workflows

Formatting and linting run automatically on commit via husky hooks.
