import { expect, test } from '@playwright/test';
import { config } from '../tests/utils/config';
import {
  addAzureModelToWizardConfiguration,
  addSystemPromptToConfiguration,
  configureAssistantByUser,
  enterUserArea,
  goToWelcomePage,
  loginFirstTime,
  newChat,
  selectConfiguration,
  sendMessage,
} from '../tests/utils/helper';

if (!config.AZURE_OPEN_AI_API_KEY) {
  test.skip('should configure Azure OpenAI-Open AI LLM for chats [skipped due to missing API_KEY in env]', () => {});
} else {
  test('configurable arguments', async ({ page }) => {
    const configuration = { name: '', description: '' };

    await test.step('should login', async () => {
      await loginFirstTime(page);
      await goToWelcomePage(page);
    });

    await test.step('add assistant', async () => {
      configuration.name = `E2E-Test-Configurable-Arguments-${Date.now()}`;
      configuration.description = `Description for ${configuration.name}`;
      await page.getByRole('link', { name: 'Setup an Assistant' }).click();
      await expect(page).toHaveURL(/\/admin\/assistants\?create/);
      await page.getByRole('textbox', { name: 'Name' }).fill(configuration.name);
      await page.getByRole('textbox', { name: 'Description' }).fill(configuration.description);
      await page.getByRole('button', { name: 'Save' }).click();
    });

    await test.step('add model', async () => {
      await addAzureModelToWizardConfiguration(page, { deployment: 'gpt-4o-mini' });
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
