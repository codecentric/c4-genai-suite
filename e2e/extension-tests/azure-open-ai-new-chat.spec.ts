import test, { expect } from '@playwright/test';
import { config } from '../tests/utils/config';
import {
  addAzureModelToConfiguration,
  checkSelectedConfiguration,
  createConfiguration,
  createUserIfNotExists,
  enterAdminArea,
  enterUserArea,
  login,
  logout,
  newChat,
  selectConfiguration,
  sendMessage,
  uniqueName,
} from '../tests/utils/helper';

if (!config.AZURE_OPEN_AI_API_KEY) {
  test.skip('should configure Azure OpenAI-Open AI LLM for chats [skipped due to missing API_KEY in env]', () => {});
} else {
  test('Chat workflow with Azure OpenAI LLM', async ({ page }) => {
    const configuration = { name: '', description: '' };
    await test.step('should login', async () => {
      await login(page);
    });
    const secondAssistantName = uniqueName('Second Assistant');

    await test.step('add assistant', async () => {
      await enterAdminArea(page);
      configuration.name = uniqueName('Azure-OpenAI-Chat');
      configuration.description = `Description for ${configuration.name}`;
      await createConfiguration(page, configuration);
      await createConfiguration(page, { ...configuration, name: secondAssistantName });
    });

    await test.step('add model', async () => {
      await addAzureModelToConfiguration(page, configuration, { deployment: 'gpt-4o-mini' });
      await addAzureModelToConfiguration(page, { ...configuration, name: secondAssistantName }, { deployment: 'gpt-4o-mini' });
    });

    await test.step('switch user', async () => {
      // Since we test on the total number of conversations, we switch here to a fresh user without conversation.
      // This way we do not need to delete the conversations of the admin account
      // (which would lead to problems if we ever want to run the tests in parallel)
      const testuserName = uniqueName('test-user');
      await createUserIfNotExists(page, {
        name: testuserName,
        email: `${testuserName}@example.com`,
        password: 'test-secret',
      });
      await logout(page);
      await login(page, { email: `${testuserName}@example.com`, password: 'test-secret' });
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

      const conversationNavItemsPre = page.getByRole('navigation');
      await expect(conversationNavItemsPre.first()).toBeAttached({ timeout: 10000 });
      await expect(conversationNavItemsPre).toHaveCount(1);
    });

    await test.step('should not create conversations before first query', async () => {
      await page.getByRole('button', { name: 'New chat' }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('navigation')).toHaveCount(1);
    });

    await test.step('should not create multiple empty conversations via multiple clicks on the new chat button', async () => {
      await newChat(page);
      const firstChatUrl = page.url();
      await newChat(page);
      const secondChatUrl = page.url();
      expect(secondChatUrl).toBe(firstChatUrl);
      await expect(page.getByRole('navigation')).toHaveCount(1);
    });

    await test.step('should keep selected assistant in new chat when a conversation is deleted', async () => {
      await newChat(page);
      const assistant = { name: secondAssistantName };
      await selectConfiguration(page, assistant);
      await sendMessage(page, assistant, {
        message: 'Answer as short as possible: What is the answer to life, the universe and everything?',
      });
      // there is already a chat in the history, wait for the second chat to appear and click the newest one
      await page.locator('svg.tabler-icon-dots').nth(1).waitFor();
      await page.locator('svg.tabler-icon-dots').nth(0).click();
      const dropdown = page.locator('.mantine-Menu-dropdown');
      await expect(dropdown).toBeVisible();
      await dropdown.locator('text=Delete').click();
      const welcomeText = page.getByText('How may I help you?');
      await welcomeText.waitFor();
      await checkSelectedConfiguration(page, assistant);
    });
  });
}
