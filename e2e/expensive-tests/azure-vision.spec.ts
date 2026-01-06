import { expect, test } from '@playwright/test';
import { config } from '../tests/utils/config';
import {
  addAzureModelToConfiguration,
  addSystemPromptToConfiguration,
  addVisionFileExtensionToConfiguration,
  cleanup,
  createConfiguration,
  enterAdminArea,
  enterUserArea,
  login,
  newChat,
  selectConfiguration,
  sendMessage,
  uniqueName,
  uploadFileWithPaperclip,
} from '../tests/utils/helper';

if (!config.AZURE_OPEN_AI_API_KEY) {
  test.skip('should configure Azure OpenAI-Open AI LLM for chats [skipped due to missing API_KEY in env]', () => {});
} else {
  test('vision extension', async ({ page }) => {
    const configuration = { name: '', description: '' };
    await test.step('should login', async () => {
      await login(page);
      await cleanup(page);
    });

    await test.step('add assistant', async () => {
      configuration.name = uniqueName('E2E-Vision');
      configuration.description = `Description for ${configuration.name}`;
      await enterAdminArea(page);
      await createConfiguration(page, configuration);
    });

    await test.step('add model', async () => {
      await addAzureModelToConfiguration(page, configuration, { deployment: 'gpt-4o-mini' });
    });

    await test.step('add prompt', async () => {
      await addSystemPromptToConfiguration(page, configuration, { text: 'You are a helpful assistant.' });
    });

    await test.step('should add vision extension', async () => {
      await enterAdminArea(page);
      await addVisionFileExtensionToConfiguration(page, configuration);
    });

    await test.step('should start chat in new configuration', async () => {
      await enterUserArea(page);
      await newChat(page);
      await selectConfiguration(page, configuration);
    });

    await test.step('should upload image', async () => {
      await uploadFileWithPaperclip(page, 'image.JPG');
      await sendMessage(page, configuration, {
        message: 'Describe the picture. If this contains text, retrieve the content of the text',
      });
      const testOutput = await page.waitForSelector(`:has-text("codecentric")`);
      expect(testOutput).not.toBeNull();
    });
  });
}
