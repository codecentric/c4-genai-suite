import { expect, test } from '@playwright/test';
import {
  addMockModelToConfiguration,
  addSystemPromptToConfiguration,
  configureAssistantByUser,
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

test('configurable arguments', async ({ page }) => {
  const mockServer = await startMockLLMServer(4101);
  const configuration = { name: '', description: '' };

  try {
    await test.step('should login', async () => {
      await login(page);
    });

    await test.step('add assistant', async () => {
      configuration.name = uniqueName('E2E-Test-Configurable-Arguments');
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
      await addSystemPromptToConfiguration(page, configuration, { text: 'You are a helpful assistant.', configurable: true });
    });

    await test.step('create new chat', async () => {
      await enterUserArea(page);
      await newChat(page);
      await selectConfiguration(page, configuration);
    });

    await test.step('create configuration', async () => {
      await configureAssistantByUser(page, {
        values: [{ label: 'Text', value: 'Speak like a pirate and always mention that your parrot died.' }],
      });
    });

    await test.step('send prompt', async () => {
      await sendMessage(page, configuration, { message: 'What is the capital of Germany?' });
      const testoutput = await page.waitForSelector(`:has-text("parrot")`);
      expect(testoutput).toBeDefined();
    });
  } finally {
    mockServer.close();
  }
});
