# Coding Conventions

**Analysis Date:** 2026-05-07

## Naming Patterns

**Files:**
- TypeScript/JavaScript: camelCase for files (e.g., `users.controller.ts`, `execute-middleware.ts`)
- Migrations: kebab-case prefixed with timestamp (e.g., `1744643609027-add-column-docid-to-files.ts`)
- React components: PascalCase (e.g., `UserProfileModal.tsx`, `DialogProvider.tsx`)
- Test files: suffix with `.spec.ts`, `.test.ts`, `.ui-unit.spec.ts`, or `.integration.spec.ts`
- E2E tests: suffix with `.spec.ts` under `e2e/tests/`

**Functions:**
- camelCase for all functions (e.g., `getUserById()`, `handleAiSdkChainExecution()`)
- Async functions allowed without special prefix
- Middleware/handler classes use suffix pattern: `*Handler`, `*Middleware` (e.g., `TestExtensionHandler`, `ExecuteMiddleware`)

**Variables:**
- camelCase for local variables and constants (e.g., `const maxWorkers = 1`)
- UPPER_SNAKE_CASE for constants that won't change (e.g., `const appPrefix = 'c4'`)
- Unused variables prefixed with underscore (e.g., `_signal`, `_key`)

**Types:**
- PascalCase for interfaces and types (e.g., `ExtensionConfiguration`, `ChatContext`)
- PascalCase for classes (e.g., `ExecuteMiddleware`, `OpenAIModelExtension`)
- Enum members: PascalCase (e.g., `bucket_type_enum` enum values: `'general'`, `'user'`, `'conversation'`)
- DTO/Model suffix: PascalCase with `Dto`, `Model`, `Entity` suffix (e.g., `SettingsDto`, `ConfigurationModel`, `ExtensionEntity`)

## Code Style

**Formatting:**
- Tool: Prettier
- Line width: 130 characters (backend), default for frontend
- Indentation: 2 spaces
- Semicolons: required
- Single quotes: enforced (both backend and frontend)
- Trailing commas: `all` (backend), `es5` (root .prettierrc)
- End of line: LF

**Linting:**
- Backend: ESLint with TypeScript strict rules
- Frontend: ESLint with React, React Hooks, and React Refresh rules
- Both: `@typescript-eslint/recommended-requiring-type-checking` enabled
- Both: `prettier/recommended` enforced via ESLint

**Key ESLint Rules:**
- Backend & Frontend:
  - `@typescript-eslint/no-unused-vars`: error, with patterns `^_` ignored for vars/args/errors
  - `import/order`: enforced alphabetically with src imports after externals
  - `sort-imports`: enforced with case-insensitive alphabetical order
  - `no-warning-comments`: error (TODO/FIXME not allowed in comments - use proper issues)
- Frontend-specific:
  - `custom/no-zustand-outside-state`: error (Zustand state must be accessed via hooks in specific paths: `src/pages/chat/state`, `src/hooks/api/files.ts`, `src/hooks/conversation-extension-context.ts`)
  - `custom/no-restricted-api-conversations`: error (API calls restricted to hooks, enforces hook-based state management)
  - `react-refresh/only-export-components`: error (export only components from .tsx files)
  - `no-restricted-imports`: patterns disallow direct access to `*/state/zustand/*`, require using hooks instead
- Backend-specific:
  - Generated code paths excluded: `/generated/`, database interfaces (`/database/interfaces.ts`)
  - `@typescript-eslint/unbound-method`: disabled in test files (jest.fn() mock objects create false positives)

## Import Organization

**Order:**
1. Node.js built-in modules (e.g., `import * as fs from 'fs'`)
2. External dependencies (e.g., `import { NestFactory } from '@nestjs/core'`)
3. Internal src imports (e.g., `import { User } from 'src/domain/users'`)

**Path Aliases:**
- Backend: `src/*` maps to project root
- Frontend: `src` alias configured in `vite.config.ts`

**Alphabetization:** Enforced alphabetically within each group; case-insensitive

## Error Handling

**Backend:**
- Use NestJS built-in exceptions: `BadRequestException`, `NotFoundException`, `HttpException`
- Example: `throw new NotFoundException('Cannot find extension.')`
- Middleware chains catch errors and re-throw after logging/processing
- `ExceptionMiddleware` at end of chain catches unhandled errors and formats response
- Nested try-catch in middleware (e.g., `execute-middleware.ts`): catches AI SDK errors, tracks metrics, re-throws

**Frontend:**
- React components use error boundaries and try-catch in async handlers
- API errors handled via React Query hooks with error callbacks
- Toast notifications for user-facing errors: `toast.error()`, `toast.success()`
- Dialog provider for confirmation workflows

**Pattern Example (Backend):**
```typescript
try {
  await this.execute(context);
  this.metricsService.prompts.inc({ user: context.user.id, status: 'successful' });
} catch (err) {
  this.metricsService.prompts.inc({ user: context.user.id, status: 'failed' });
  throw err;
}
```

## Logging

**Framework:** NestJS Logger (injected via constructor) + Winston for application logging

**Where to Log:**
- Extension discovery and loading: `src/extensions/module.ts` - log successful loads and errors
- Tool execution errors: tools (e.g., `gemini-image.ts`, `mcp-tools.ts`) log with error messages and stack traces
- Middleware: injected Logger for middleware-level operations
- Global: ConfigService logger for bootstrap

**Pattern:**
```typescript
private readonly logger = new Logger(ClassName.name);

// In methods
this.logger.error(`Error occurred in extension ${this.name}: ${error.message}`, error.stack);
this.logger.log(`Loaded extension: ${extensionKey}`);
this.logger.warn('Message');
```

## Comments

**When to Comment:**
- Complex algorithms in middleware (e.g., "this is the general structure of how AI SDK wraps errors")
- Non-obvious error handling patterns
- Configuration explanations
- Workarounds for framework quirks

**JSDoc/TSDoc:**
- Limited use in codebase; generated API code has JSDoc (auto-generated from OpenAPI specs)
- Avoid over-commenting simple, self-explanatory code
- Extension interfaces have JSDoc for public API (e.g., `Extension.test()` method)

## Function Design

**Size:** 
- Keep functions focused on single responsibility
- Middleware handlers typically 10-30 lines
- Use helper methods for complex logic (e.g., `buildToolSet()` extracted in `execute-middleware.ts`)

**Parameters:** 
- Backend: dependency injection via constructor (NestJS pattern)
- Frontend: React props interface for component parameters
- Middleware: uniform signature - `async invoke(context: ChatContext)`

**Return Values:** 
- Async functions return `Promise<T>`
- Middleware invoke methods return `Promise<void>` but mutate context
- Service methods return DTOs or entities (e.g., `Promise<SettingsDto>`)

## Module Design

**Exports:** 
- Backend: barrel files (`index.ts`) export public APIs only
- Frontend: component exports for routing, hook exports for logic
- Extensions: exported via dynamic loader in `src/extensions/module.ts`

**Barrel Files:** 
- Used selectively in domain folders (e.g., `src/domain/extensions/index.ts` exports Extension interface)
- Reduces import depth: `import { Extension } from 'src/domain/extensions'` instead of `src/domain/extensions/interfaces`

## Type Safety

**TypeScript Settings:**
- `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`
- Decorators enabled (`experimentalDecorators: true`)
- No type assertions without `as Type` syntax
- Generated code excluded from type checking

**Frontend:**
- React 19 with TypeScript strict mode
- Zod for runtime validation (schema definitions for forms, DTOs)
- Mantine form validation using `zod4Resolver`

**Backend:**
- Class-validator for DTO validation
- Class-transformer for object transformation
- TypeORM entities with strict column types

## Database & ORM

**TypeORM Conventions:**
- Entities in `src/domain/database/entities/` (e.g., `UserEntity`, `ConversationEntity`)
- Migration naming: kebab-case timestamp prefix: `src/migrations/TIMESTAMP-description.ts`
- Repositories use `@InjectRepository()` decorator pattern
- Query builders for complex queries; avoid raw SQL when possible

## State Management

**Frontend (Zustand):**
- Store definitions in `src/api/state/zustand/` (e.g., `conversationState.ts`)
- Access only via hooks in `src/hooks/api/` or `src/api/state/` (enforced by ESLint rule `no-zustand-outside-state`)
- Hooks abstract store subscriptions; components use hooks not stores directly
- Example hook pattern: `export const useConversationState = () => useShallow(conversationState)`

**Backend (NestJS CQRS):**
- Commands for state mutations (e.g., `DeleteExtension` command)
- Queries for reads (e.g., `GetExtensions` query)
- CommandBus/QueryBus pattern used in controllers and use-cases
- Handlers decorated with `@CommandHandler()` or `@QueryHandler()`

## Extension System

**Pattern:**
- All extensions implement `Extension` interface (`src/domain/extensions/interfaces.ts`)
- Metadata in `spec` property (name, description, arguments)
- `getMiddlewares()` method returns array of middlewares applied to chat pipeline
- `test()` method optional for validating configuration
- Categories: Models, Tools, Other

**Example:**
```typescript
export class MyExtension implements Extension {
  spec: ExtensionSpec = { /* ... */ };
  
  async getMiddlewares?(user: User, entity: ExtensionEntity): Promise<ChatMiddleware[]> {
    return [new MyMiddleware()];
  }
  
  async test?(config: ExtensionConfiguration): Promise<void> {
    // Validate config
  }
}
```

## Architecture Patterns

**Middleware Chain (Backend):**
- Middlewares execute in order (ORDER property defines sequence)
- Each middleware receives ChatContext, next function, and getContext resolver
- Middlewares mutate context (add LLMs, tools, messages) or modify behavior
- Pattern: `async invoke(context: ChatContext, getContext: GetContextFn, next: NextFn)`

**Command/Query Handlers (Backend):**
- One handler per command/query
- Decorated with `@CommandHandler(Command)` or `@QueryHandler(Query)`
- Implement `ICommandHandler<Command, ReturnType>` or `IQueryHandler<Query, ReturnType>`
- Exception throwing from handlers - exceptions handled by NestJS global exception filter

**React Hooks (Frontend):**
- Custom hooks for API calls in `src/hooks/api/` using React Query
- Form hooks leverage Mantine form with Zod validation
- Context hooks for theme, profile, dialog, transient link state
- Pattern: `export const useHookName = () => { /* hook logic */ }`

---

*Convention analysis: 2026-05-07*
