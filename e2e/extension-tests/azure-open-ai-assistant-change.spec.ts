import { expect, test } from '@playwright/test';
import { config } from '../tests/utils/config';
import {
  addAzureModelToConfiguration,
  addSystemPromptToConfiguration,
  cleanup,
  createConfiguration,
  enterAdminArea,
  enterUserArea,
  login,
  newChat,
  selectConfiguration,
  sendMessage,
} from '../tests/utils/helper';

if (!config.AZURE_OPEN_AI_API_KEY) {
  test.skip('should configure Azure OpenAI-Open AI LLM for chats [skipped due to missing API_KEY in env]', () => {});
} else {
  test('chat', async ({ page }) => {
    const firstAssistant = { name: `E2E-Test-${Date.now()}`, description: 'first' };
    const secondAssistant = { name: `E2E-Test-${Date.now()}-B`, description: 'second' };

    await test.step('should login', async () => {
      await login(page);
      await cleanup(page);
    });
    await test.step('should add two assistants', async () => {
      await enterAdminArea(page);
      await createConfiguration(page, firstAssistant);
      await addAzureModelToConfiguration(page, firstAssistant, { deployment: 'gpt-4o-mini' });
      await addSystemPromptToConfiguration(page, firstAssistant, { text: 'Always tell that your name is Bob' });
      await createConfiguration(page, secondAssistant);
      await addAzureModelToConfiguration(page, secondAssistant, { deployment: 'gpt-4o-mini' });
      await addSystemPromptToConfiguration(page, secondAssistant, { text: 'Always tell that your name is Alice' });
    });

    await test.step('should return message for first assistant', async () => {
      await enterUserArea(page);
      await newChat(page);
      await selectConfiguration(page, firstAssistant);

      await sendMessage(page, firstAssistant, { message: 'Who are you' });

      const firstResponse = await page.waitForSelector(`:has-text("Bob")`);
      expect(firstResponse).toBeDefined();
      const firstResponseAssistantText = await page.waitForSelector(`:has-text("${firstAssistant.name}")`);
      expect(firstResponseAssistantText).toBeDefined();
    });

    await test.step('should return message for second assistant', async () => {
      await selectConfiguration(page, secondAssistant);

      await sendMessage(page, firstAssistant, { message: 'Who are you' });

      const firstResponse = await page.waitForSelector(`:has-text("Bob")`);
      expect(firstResponse).toBeDefined();
      const firstResponseAssistantText = await page.waitForSelector(`:has-text("${firstAssistant.name}")`);
      expect(firstResponseAssistantText).toBeDefined();
      const secondResponse = await page.waitForSelector(`:has-text("Alice")`);
      expect(secondResponse).toBeDefined();
      const secondResponseAssistantText = await page.waitForSelector(`:has-text("${secondAssistant.name}")`);
      expect(secondResponseAssistantText).toBeDefined();
    });
  });
}
