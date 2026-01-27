import { expect, test } from '@playwright/test';
import { config } from '../tests/utils/config';
import {
  addMCPToConfiguration,
  addMockModelToConfiguration,
  addSystemPromptToConfiguration,
  createConfiguration,
  enterAdminArea,
  enterUserArea,
  login,
  newChat,
  selectConfiguration,
  sendMessage,
  uniqueName,
} from '../tests/utils/helper';
import { startMockLLMServer } from '../tests/utils/mock-llm-server';

test('mcp', async ({ page }) => {
  const mockServer = await startMockLLMServer(4102);
  const configuration = { name: '', description: '' };

  try {
    await test.step('should login', async () => {
      await login(page);
    });

    await test.step('add assistant', async () => {
      configuration.name = uniqueName('E2E-Test-MCP');
      configuration.description = `Description for ${configuration.name}`;
      await enterAdminArea(page);
      await createConfiguration(page, configuration);
    });

    await test.step('add model', async () => {
      await addMockModelToConfiguration(page, configuration, {
        endpoint: mockServer.url,
      });
    });

    await test.step('add prompt', async () => {
      await addSystemPromptToConfiguration(page, configuration, { text: 'You are a helpful assistant.' });
    });

    await test.step('add mcp extension', async () => {
      await addMCPToConfiguration(page, configuration, { name: 'MCP Fetch', endpoint: config.MCP_SERVER_ENDPOINT });
    });

    await test.step('create new chat', async () => {
      await enterUserArea(page);
      await newChat(page);
      await selectConfiguration(page, configuration);
    });

    await test.step('send prompt', async () => {
      await sendMessage(page, configuration, {
        message: 'When was the building built according to this Wikipedia page: https://de.wikipedia.org/wiki/Amtsgericht_Ohligs',
      });
      const tool = await page.waitForSelector(`:has-text("MCP Fetch: fetch")`);
      expect(tool).toBeDefined();
      const result = await page.waitForSelector(`:has-text("1895")`);
      expect(result).toBeDefined();
    });
  } finally {
    mockServer.close();
  }
});
