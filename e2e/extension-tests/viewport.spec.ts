import test, { expect } from '@playwright/test';
import { sseBodyABC, sseBodyBanana } from '../tests/utils/files/sse-responses';
import {
  addAzureModelToConfiguration,
  createConfiguration,
  enterAdminArea,
  enterUserArea,
  expectElementInYRange,
  login,
  selectConfiguration,
  sendMessage,
  uniqueName,
} from '../tests/utils/helper';

test('Chat viewport scrolling', async ({ page }) => {
  // we do not actually need an LLM, so we mock the response
  await page.route('**/api/extensions/test', async (route) => {
    const json = {
      successful: true,
    };
    await route.fulfill({ json });
  });
  await page.route('**/api/conversations/*/messages/sse', async (route) => {
    const request = route.request();
    const postData = request.postData() || '';

    const containsBanana = postData.includes('Banane');
    const body = containsBanana ? sseBodyBanana : sseBodyABC;
    await page.waitForTimeout(600);
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
      body,
    });
  });

  const configuration = { name: uniqueName('E2E-Test'), description: '' };

  await test.step('should login', async () => {
    await login(page);
  });

  await test.step('should add mock assistant', async () => {
    configuration.description = `Example for the ${configuration.name}`;
    await enterAdminArea(page);
    await createConfiguration(page, configuration);
    await addAzureModelToConfiguration(page, configuration, { deployment: 'mocked', apiKey: 'nokey' });
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
    expect(await autoScrollButton.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });

  await test.step('should hide auto-scroll button when scrolled to bottom', async () => {
    const autoScrollButton = page.locator('[data-testid="scrollToBottomButton"]');
    await autoScrollButton.click();
    await page.waitForTimeout(1000);
    expect(await autoScrollButton.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
  });

  await test.step('should show and allow clicking auto-scroll button when user scrolls up', async () => {
    await page.mouse.wheel(0, -800);
    const autoScrollButton = page.locator('[data-testid="scrollToBottomButton"]');
    await page.waitForTimeout(1000);
    expect(await autoScrollButton.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    await autoScrollButton.click();
    await page.waitForTimeout(1000);
    expect(await autoScrollButton.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
  });

  await test.step('should stop showing auto-scroll button, if new chat is opened, while button was visible', async () => {
    await sendMessage(page, configuration, {
      message: 'Write a two-column table with the upper case letters from A to Z followed by a random short word in the rows.',
    });
    await page.waitForTimeout(1500);
    const autoScrollButton = page.locator('[data-testid="scrollToBottomButton"]');
    expect(await autoScrollButton.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    // since we are mocking all responses, the backend did not create a new conversation
    // thus we just change to another chat manually, but without reload
    await page.evaluate(() => {
      window.history.pushState({}, '', '/chat/1');
      window.dispatchEvent(new Event('popstate'));
    });
    await page.waitForTimeout(1500);
    expect(await autoScrollButton.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
  });
});
