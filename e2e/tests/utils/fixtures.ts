import { test as base } from '@playwright/test';
import { startMockLLMServer } from './mock-llm-server';

interface MockServerFixture {
  mockServerUrl: string;
}

// Base port for mock LLM servers - each worker gets its own port (basePort + workerIndex)
const MOCK_LLM_BASE_PORT = 4100;

export const test = base.extend<object, MockServerFixture>({
  // Worker-scoped fixture - starts once per worker, shared across all tests in that worker
  mockServerUrl: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use, workerInfo) => {
      // Each worker gets a unique port to allow parallel execution
      const port = MOCK_LLM_BASE_PORT + workerInfo.workerIndex;
      const mockServer = await startMockLLMServer(port);
      console.log(`[Fixture] Mock LLM server started at ${mockServer.url} (worker ${workerInfo.workerIndex})`);

      await use(mockServer.url);

      mockServer.close();
      console.log(`[Fixture] Mock LLM server stopped (worker ${workerInfo.workerIndex})`);
    },
    { scope: 'worker' },
  ],
});
