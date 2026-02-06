import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';

// Setup MSW server for Node.js environment (tests)
export const server = setupServer();

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());
