import test, { expect } from '@playwright/test';
import {
  addMockModelToConfiguration,
  addSystemPromptToConfiguration,
  createConfiguration,
  enterAdminArea,
  enterUserArea,
  expectElementInYRange,
  login,
  selectConfiguration,
  sendMessage,
  uniqueName,
} from '../utils/helper';
import { startMockLLMServer } from '../utils/mock-llm-server';

test('Chat viewport scrolling', async ({ page }) => {
  // Start mock LLM server on port 4108
  const mockServer = await startMockLLMServer(4108);

  try {
    const configuration = { name: uniqueName('E2E-Test'), description: '' };

    await test.step('should login', async () => {
      await login(page);
    });

    await test.step('should add mock assistant', async () => {
      configuration.description = `Example for the ${configuration.name}`;
      await enterAdminArea(page);
      await createConfiguration(page, configuration);
      await addMockModelToConfiguration(page, configuration, { endpoint: mockServer.url });
      await addSystemPromptToConfiguration(page, configuration, { text: 'You are a helpful assistant.' });
    });

    await test.step('should reply to questions in the chat', async () => {
      await enterUserArea(page);
      await selectConfiguration(page, configuration);
      await sendMessage(page, configuration, {
        message: 'Wie sagt man auf Englisch Banane. Antworte ohne Großbuchstaben in einem Wort.',
      });
      const testoutput = await page.waitForSelector(`:has-text("banana")`);
      expect(testoutput).toBeDefined();
    });

    await test.step('should not show previous reply in viewport after sending question', async () => {
      await sendMessage(page, configuration, {
        message: 'Write a two-column table with the lower case letters from a to z followed by a random short word in the rows.',
      });
      await page.waitForTimeout(1500);
      const element = page.getByText(/^Wie sagt man auf Englisch Banane.+Friendly AI/);
      await expectElementInYRange(element, -200, 116);
    });

    await test.step('should show current question in viewport after sending question', async () => {
      const element = page.getByText(
        'Write a two-column table with the lower case letters from a to z followed by a random short word in the rows.',
      );
      await expectElementInYRange(element, 112, 200);
    });

    await test.step('should not scroll down when reply is too long for viewport', async () => {
      await expectElementInYRange(page.getByRole('cell', { name: 'a', exact: true }), 162, 500);
      await expectElementInYRange(page.getByRole('cell', { name: 'm', exact: true }), 500, 2000);
      await expectElementInYRange(page.getByRole('cell', { name: 'z', exact: true }), 700, 2000);
    });

    await test.step('should show auto-scroll button when reply is too long for viewport', async () => {
      const autoScrollButton = page.locator('[data-testid="scrollToBottomButton"]');
      await expect(autoScrollButton).toHaveCSS('opacity', '1');
    });

    await test.step('should hide auto-scroll button when scrolled to bottom', async () => {
      const autoScrollButton = page.locator('[data-testid="scrollToBottomButton"]');
      await autoScrollButton.click();
      await page.waitForTimeout(1000);
      await expect(autoScrollButton).toHaveCSS('opacity', '0');
    });

    await test.step('should show and allow clicking auto-scroll button when user scrolls up', async () => {
      await page.mouse.wheel(0, -800);
      const autoScrollButton = page.locator('[data-testid="scrollToBottomButton"]');
      await page.waitForTimeout(1000);
      await expect(autoScrollButton).toHaveCSS('opacity', '1');
      await autoScrollButton.click();
      await page.waitForTimeout(1000);
      await expect(autoScrollButton).toHaveCSS('opacity', '0');
    });

    await test.step('should stop showing auto-scroll button, if new chat is opened, while button was visible', async () => {
      await sendMessage(page, configuration, {
        message: 'Write a two-column table with the upper case letters from A to Z followed by a random short word in the rows.',
      });
      await page.waitForTimeout(1500);
      const autoScrollButton = page.locator('[data-testid="scrollToBottomButton"]');
      await expect(autoScrollButton).toHaveCSS('opacity', '1');
      // Start a new chat - with mock LLM server the backend creates real conversations
      await page.getByRole('button', { name: 'New chat' }).click();
      await page.waitForTimeout(1500);
      await expect(autoScrollButton).toHaveCSS('opacity', '0');
    });
  } finally {
    mockServer.close();
  }
});
