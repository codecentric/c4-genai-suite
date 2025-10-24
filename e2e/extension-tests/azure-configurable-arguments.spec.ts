import { expect, test } from '@playwright/test';
import { config } from '../tests/utils/config';
import {
  addAzureModelToConfiguration,
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

if (!config.AZURE_OPEN_AI_API_KEY) {
  test.skip('should configure Azure OpenAI-Open AI LLM for chats [skipped due to missing API_KEY in env]', () => {});
} else {
  test('configurable arguments', async ({ page }) => {
    const configuration = { name: '', description: '' };

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
      await addAzureModelToConfiguration(page, configuration, { deployment: 'gpt-4o-mini' });
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
  });
}
