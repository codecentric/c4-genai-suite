import { randomInt } from 'crypto';
import test, { expect } from '@playwright/test';
import { config } from '../tests/utils/config';
import {
  addAzureModelToWizardConfiguration,
  cleanup,
  enterUserArea,
  goToWelcomePage,
  login,
  newChat,
  selectConfiguration,
  sendMessage,
} from '../tests/utils/helper';

if (!config.AZURE_OPEN_AI_API_KEY) {
  test.skip('should configure Azure OpenAI-Open AI LLM for chats [skipped due to missing API_KEY in env]', () => {});
} else {
  test('Chat workflow with Azure OpenAI LLM', async ({ page }) => {
    const configuration = { name: '', description: '' };
    await test.step('should login', async () => {
      await login(page);
      await cleanup(page);
      await goToWelcomePage(page);
    });

    await test.step('add assistant', async () => {
      configuration.name = `Azure-OpenAI-Chat-${randomInt(10000)}`;
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

    await test.step('should start chat in new configuration', async () => {
      await enterUserArea(page);
      await newChat(page);
      await selectConfiguration(page, configuration);
    });

    await test.step('should create a reference conversation', async () => {
      await enterUserArea(page);
      await selectConfiguration(page, configuration);

      const userMessageContent = 'Hi!';
      await sendMessage(page, configuration, { message: userMessageContent });
      await expect(page.locator('.chat-main :has-text("Tokens")').last()).toBeVisible({ timeout: 10000 });

      const conversationNavItemsPre = page.getByRole('navigation');
      await expect(conversationNavItemsPre.first()).toBeAttached({ timeout: 10000 });
      await expect(conversationNavItemsPre).toHaveCount(1);
    });

    await test.step('should not create conversations before first query', async () => {
      await page.getByRole('button', { name: 'New chat' }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('navigation')).toHaveCount(1);
    });

    await test.step('should not create multiple empty conversations via multiple clicks one the new chat button', async () => {
      await page.getByRole('button', { name: 'New chat' }).click();
      await page.waitForLoadState('networkidle');
      const firstChatUrl = page.url();
      await page.getByRole('button', { name: 'New chat' }).click();
      await page.waitForLoadState('networkidle');
      const secondChatUrl = page.url();
      expect(secondChatUrl).toBe(firstChatUrl);
      await expect(page.getByRole('navigation')).toHaveCount(1);
    });
  });
}
