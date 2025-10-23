import { expect, test } from '@playwright/test';
import { config } from '../tests/utils/config';
import {
  addAzureModelToConfiguration,
  addBucketToConfiguration,
  addSystemPromptToConfiguration,
  cleanup,
  createBucket,
  createConfiguration,
  editBucket,
  enterAdminArea,
  enterUserArea,
  expectA11yCompliant,
  expectElementInYRange,
  login,
  newChat,
  selectConfiguration,
  sendMessage,
  uploadFileWhileInChat,
} from '../tests/utils/helper';

if (!config.AZURE_OPEN_AI_API_KEY) {
  test.skip('should configure Azure OpenAI-Open AI LLM for chats [skipped due to missing API_KEY in env]', () => {});
} else {
  test('chat', async ({ page }) => {
    const configuration = { name: `E2E-Test-${Date.now()}`, description: '' };
    const bucket = { name: 'E2E-User-Bucket' };

    await test.step('should login', async () => {
      await login(page);
      await cleanup(page);
    });
    await test.step('should not add Configuration without required fields', async () => {
      await enterAdminArea(page);
      await createConfiguration(page, configuration, { detached: false });

      const testoutput = await page.waitForSelector(`:has-text("String must contain at least")`);
      expect(testoutput).toBeDefined();

      await page.getByText('Cancel').click();
    });

    await test.step('should add Configuration', async () => {
      configuration.description = `Example for the ${configuration.name}`;
      await createConfiguration(page, configuration);
    });

    await test.step('should add OpenAI LLM Extension', async () => {
      await addAzureModelToConfiguration(page, configuration, { deployment: 'gpt-4o-mini' });
    });

    await test.step('add prompt', async () => {
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

    await test.step('should render image', async () => {
      const imageUrl = 'fakeUrl';
      await sendMessage(page, configuration, {
        message: `Can you reply with this markdown and only this markdown?: ![Image](${imageUrl})`,
      });
      await page.waitForTimeout(500);
      const image = page.getByRole('img', { name: 'Image' }).first();
      expect(await image.getAttribute('src')).toBe(imageUrl);
      await expect(image).toBeVisible();

      await expectA11yCompliant(page);
    });

    await test.step('should edit message', async () => {
      const chatItemLocator = page.getByTestId('chat-item');

      const chatItem = chatItemLocator.first();
      const itemText = await chatItem.textContent();
      expect(itemText).toBe('Wie sagt man auf Englisch Banane. Antworte ohne Großbuchstaben in einem Wort.');

      const editButton = chatItem.locator('button .tabler-icon-pencil');
      await chatItem.hover();
      await editButton.click();
      await chatItem.getByRole('textbox').fill('What is the capital of Germany?');
      await chatItem.getByRole('button', { name: 'Send' }).click();

      await page.waitForSelector(`:has-text("Berlin")`);
      const newChatItemCount = await chatItemLocator.count();
      const newChatItemText = await chatItem.textContent();

      expect(newChatItemText).toBe('What is the capital of Germany?');
      expect(newChatItemCount).toBe(2);
    });

    await test.step('should not show previous reply in viewport after sending question', async () => {
      await sendMessage(page, configuration, {
        message: 'Write a two-column table with the lower case letters from a to z followed by a random short word in the rows.',
      });
      await page.waitForTimeout(1000);
      const element = page.getByText(/^What is the capital of Germany.+Friendly AI/);
      await expectElementInYRange(element, -200, 116);
    });

    await test.step('should show current question in viewport after sending question', async () => {
      const element = page.getByText(
        'Write a two-column table with the lower case letters from a to z followed by a random short word in the rows.',
      );
      await expectElementInYRange(element, 112, 200);
    });

    await test.step('should not scroll down when reply is to long for viewport', async () => {
      await expectElementInYRange(page.getByRole('cell', { name: 'a', exact: true }), 162, 500);
      await expectElementInYRange(page.getByRole('cell', { name: 'm', exact: true }), 500, 2000);
      await expectElementInYRange(page.getByRole('cell', { name: 'z', exact: true }), 700, 2000);
    });

    await test.step('should show auto-scroll button when reply is to long for viewport', async () => {
      const autoScrollButton = page.locator('[data-testid="scrollToBottomButton"]');
      await page.waitForTimeout(2500);
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
      await page.waitForTimeout(5000);
      const autoScrollButton = page.locator('[data-testid="scrollToBottomButton"]');
      expect(await autoScrollButton.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
      await newChat(page);
      await page.waitForTimeout(3500);
      expect(await autoScrollButton.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
    });

    await test.step('should create bucket', async () => {
      await enterAdminArea(page);
      await createBucket(page, {
        name: bucket.name,
        type: 'user',
        endpoint: config.REIS_ENDPOINT,
      });
    });

    await test.step('should add bucket to Configuration', async () => {
      await addBucketToConfiguration(page, configuration, {
        bucketName: bucket.name,
        description: 'Some files with keywords',
      });
    });

    await test.step('should edit file size limits', async () => {
      await editBucket(page, { name: bucket.name, fileSizeLimits: { general: 1, pptx: 0, md: 2 } });
    });

    await test.step('should reject large file', async () => {
      await enterUserArea(page);
      await newChat(page);
      await selectConfiguration(page, configuration);
      await uploadFileWhileInChat(page, 'birthdays.pptx', true);
      await page
        .getByRole('alert')
        .filter({ hasText: /^Failed to upload file. 'birthdays.pptx': The file is larger than allowed for this file type./ })
        .click();
    });

    await test.step('should add file to user bucket while chat is open and utf-8 filename is used', async () => {
      await uploadFileWhileInChat(page, 'keyword_ä_ö_ß.MD');
    });

    await test.step('should reply with file content if asked', async () => {
      await selectConfiguration(page, configuration);
      await sendMessage(page, configuration, { message: 'give me the keyword' });
      await page.waitForSelector(`:has-text("codecentricE2E")`);
    });

    await test.step('should show sources used for the reply', async () => {
      const sourcesSection = page.locator('[data-testid="sources-section"]');
      await expect(sourcesSection).toBeVisible();
      const sourcesEntry = sourcesSection.locator(`ul > li >> text=keyword_ä_ö_ß.MD`);
      await expect(sourcesEntry).toHaveCount(1);
      await expectA11yCompliant(page);
    });

    await test.step('should start new Chat and already uploaded file should not be checked', async () => {
      await page.getByRole('button', { name: 'New chat' }).click();
      await page.waitForSelector('[data-testid="sources-section"]', { state: 'detached' });
      await page.getByText('How may I help you?').waitFor();
      await selectConfiguration(page, configuration);
      const keywordFile = page.getByText('keyword_ä_ö_ß.MD');

      await expect(keywordFile).toBeVisible();

      const checkboxKeywordFile = page
        .locator('div')
        .filter({ hasText: /^keyword_ä_ö_ß.MD$/ })
        .getByRole('checkbox');

      await expect(checkboxKeywordFile).not.toBeChecked();
    });

    await test.step('should upload a new file and this should be selected', async () => {
      await uploadFileWhileInChat(page, 'e2e-test.txt');
      const keywordFile = page.getByText('keyword_ä_ö_ß.MD').first();
      const secondFile = page.getByText('e2e-test.txt').first();

      await expect(keywordFile).toBeVisible();
      await expect(secondFile).toBeVisible();

      const checkboxKeywordFile = page
        .locator('div')
        .filter({ hasText: /^keyword_ä_ö_ß.MD$/ })
        .getByRole('checkbox');
      const checkboxNewFile = page
        .locator('div')
        .filter({ hasText: /^e2e-test.txt$/ })
        .getByRole('checkbox');

      await expect(checkboxKeywordFile).not.toBeChecked();
      await expect(checkboxNewFile).toBeChecked();
    });

    await test.step('should answer how many uploaded files exist', async () => {
      await sendMessage(page, configuration, {
        message: 'how many files are selected, answer in format x files (e.g. 3 files)',
      });
      await page.waitForSelector(`:has-text("1 file")`);
    });

    await test.step('should reply with the content of the new uploaded file', async () => {
      await sendMessage(page, configuration, {
        message:
          'Search the file for the codeword "pudding". Display the content of every search result, regardless whether it contains the codeword.',
      });
      await page.waitForSelector(`:has-text("c4-test")`);
    });

    await test.step('should preview the used sources', async () => {
      await page.getByTestId('sources-section').locator('a').click();
      await page.waitForSelector(`:has-text("[...] c4-test [...]")`);
      await expectA11yCompliant(page);
    });

    await test.step('should close the source preview panel', async () => {
      await page.locator('#right').getByRole('button', { name: 'close' }).click();
      await page.waitForSelector(`:has-text("[...] c4-test [...]")`, { state: 'detached' });
    });

    await test.step('should deselect all files', async () => {
      await page.getByRole('button', { name: 'Deselect all' }).click();

      const checkboxKeywordFile = page
        .locator('div')
        .filter({ hasText: /^keyword_ä_ö_ß.MD$/ })
        .getByRole('checkbox');
      const checkboxNewFile = page
        .locator('div')
        .filter({ hasText: /^e2e-test.txt$/ })
        .getByRole('checkbox');

      await expect(checkboxKeywordFile).not.toBeChecked();
      await expect(checkboxNewFile).not.toBeChecked();
    });

    await test.step('should reply questions about not selected files', async () => {
      await sendMessage(page, configuration, {
        message: 'Search the file for a codeword, if there are no source files, answer just and only "no files"',
      });
      await page.waitForSelector(`:has-text("no files")`);
    });

    await test.step('should select all files', async () => {
      await page.getByRole('button', { name: 'Select all', exact: true }).click();

      const checkboxKeywordFile = page
        .locator('div')
        .filter({ hasText: /^keyword_ä_ö_ß.MD$/ })
        .getByRole('checkbox');
      const checkboxNewFile = page
        .locator('div')
        .filter({ hasText: /^e2e-test.txt$/ })
        .getByRole('checkbox');

      await expect(checkboxKeywordFile).toBeChecked();
      await expect(checkboxNewFile).toBeChecked();
    });

    await test.step('should reply questions about selected files', async () => {
      await sendMessage(page, configuration, {
        message:
          'Please search the user uploaded files for the keyword "pudding". Display the content of every search result, regardless whether it contains the keyword.',
      });
      await page.waitForSelector(`:has-text("codecentricE2E")`);
      await page.waitForSelector(`:has-text("c4-test")`);
    });
  });
}
