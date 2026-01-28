import { expect } from '@playwright/test';
import { config } from '../utils/config';
import { test } from '../utils/fixtures';
import {
  addFilesInChatExtensionToConfiguration,
  addMockModelToConfiguration,
  addSystemPromptToConfiguration,
  createBucketIfNotExist,
  createConfiguration,
  deleteFirstFileFromPaperclip,
  duplicateActiveConversation,
  editBucket,
  enterAdminArea,
  enterUserArea,
  globalConversationBucketName,
  login,
  newChat,
  selectConfiguration,
  sendMessage,
  uniqueName,
  uploadFileWithPaperclip,
} from '../utils/helper';

test('files in chat', async ({ page, mockServerUrl }) => {
  let originalConversationWithChatWithFiles: string | null;
  const conversationFilesBucket = globalConversationBucketName();

  const configuration = { name: '', description: '' };

  await test.step('should login', async () => {
    await login(page);
  });

  await test.step('add assistant', async () => {
    configuration.name = uniqueName('E2E-Test-Other');
    configuration.description = `Description for ${configuration.name}`;
    await enterAdminArea(page);
    await createConfiguration(page, configuration);
    await addMockModelToConfiguration(page, configuration, { endpoint: mockServerUrl });
    await addSystemPromptToConfiguration(page, configuration, { text: 'Your are a helpful assistant.' });
    await createBucketIfNotExist(page, {
      name: conversationFilesBucket,
      type: 'conversation',
      endpoint: config.REIS_ENDPOINT,
    });
    await editBucket(page, { name: conversationFilesBucket, fileSizeLimits: { general: 10 } });
  });

  await test.step('should add files in chat extension to Configuration', async () => {
    await addFilesInChatExtensionToConfiguration(page, configuration, {
      bucketName: conversationFilesBucket,
    });
  });

  await test.step('should show current bucket value when editing extension', async () => {
    await page.getByRole('link', { name: 'Assistants' }).click();
    await page.getByRole('link', { name: configuration.name }).click();
    await page.getByTestId('sidebar-admin').getByRole('tab', { name: 'Tools' }).click();
    await page.getByRole('heading', { name: 'Search Files in Chat', exact: true }).click();

    const bucketInput = page.getByRole('textbox', { name: 'Bucket' });
    await expect(bucketInput).toHaveValue(conversationFilesBucket);

    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  await test.step('should start chat in new configuration', async () => {
    await enterUserArea(page);
    await newChat(page);
    await selectConfiguration(page, configuration);
  });

  await test.step('should upload test file and reply to questions in the chat with file content', async () => {
    await uploadFileWithPaperclip(page, 'birthdays.pdf');
    await sendMessage(page, configuration, {
      message: 'Welche Geburtstage stehen in der Datei?',
    });
    const output = await page.waitForSelector(`:has-text("Düsentrieb")`);
    expect(output).toBeDefined();

    await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible();
    await page.getByTestId('sources-section').locator('a').getByText('birthdays.pdf').click();
    await page.waitForSelector(`:has-text("BirthdaySheet Daniel Düsentrieb Quack 02/07/2714 01/02/3456 Page 2")`);

    const source_panel = await page.waitForSelector(`:has-text("Source Content")`);
    expect(source_panel).toBeDefined();
  });

  await test.step('should show pdf representation of file referenced in source', async () => {
    await page.getByText('Source Viewer').click();
    await expect(page.locator('.pdf-viewport')).toBeVisible();
    await expect(page.locator('.pdf-viewport').getByText('Daisy Duck')).toBeVisible();
  });

  await test.step('should duplicate a conversation that includes a file uploaded with files in chat extension', async () => {
    originalConversationWithChatWithFiles = uniqueName('unq');

    await duplicateActiveConversation(page, originalConversationWithChatWithFiles);
    const duplicatedName = `${originalConversationWithChatWithFiles} (2)`;
    const duplicatedConversation = page.locator('role=navigation', { hasText: duplicatedName });

    await expect(duplicatedConversation).toBeVisible();
  });

  await test.step('should navigate to duplicated conversation with chat with files extension', async () => {
    const duplicatedConversationLocator = page.getByRole('navigation').filter({
      hasText: `${originalConversationWithChatWithFiles} (2)`,
    });

    await expect(duplicatedConversationLocator, 'Duplicated conversation link should be visible').toBeVisible({
      timeout: 15000,
    });
    await duplicatedConversationLocator.click();
    const fileChip = page.getByTestId('file-chip');
    await expect(fileChip).toBeVisible({ timeout: 3000 });
    const fileName = await fileChip.getByText('birthdays.pdf').textContent();
    expect(fileName).toBeDefined();
  });

  await test.step('should delete the file from the duplicated conversation with chat with files extension', async () => {
    await page.getByTestId('file-chip-uploaded').getByRole('button').click();
    await sendMessage(page, configuration, {
      message:
        'Welche Dateien kannst du sehen? Antworte nur mit dem Namen der Datei. Wenn du keine Datei siehst, antworte nur mit "Keine Datei gefunden".',
    });

    const answer = await page.waitForSelector(`:has-text("Keine Datei gefunden")`, { state: 'visible' });
    expect(answer).toBeDefined();
  });

  await test.step('should navigate to original conversation with chat with files and updated file should exists', async () => {
    expect(originalConversationWithChatWithFiles).not.toBeNull();

    const originalConversationLocator = page
      .getByRole('navigation')
      .filter({ hasText: new RegExp(`^${originalConversationWithChatWithFiles}$`) })
      .first();

    await expect(originalConversationLocator, 'Original conversation link should be visible').toBeVisible({
      timeout: 15000,
    });

    await originalConversationLocator.click();
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // check file chip
    const fileChip = page.getByTestId('file-chip');
    await expect(fileChip).toBeVisible({ timeout: 3000 });
    const fileName = await fileChip.getByText('birthdays.pdf').textContent();
    expect(fileName).toBeDefined();

    await sendMessage(page, configuration, {
      message:
        'Welche Dateien kannst du sehen? Antworte nur mit dem Namen der Datei. Wenn du keine Datei siehst, antworte nur mit "Keine Datei gefunden".',
    });

    const answer = await page.waitForSelector(`:has-text("birthdays.pdf")`, { state: 'visible' });
    expect(answer).toBeDefined();
    await sendMessage(page, configuration, {
      message:
        'Lies die hochgeladene Datei und sag mir, wie viele Seiten das hochgeladene Dokument hat. Antworte nur mit der Zahl.',
    });
    const output = await page.waitForSelector(`:has-text("2")`);
    expect(output).toBeDefined();
  });

  await test.step('should start a new chat, upload files and retrieve content', async () => {
    await enterAdminArea(page);
    await enterUserArea(page);
    await newChat(page);
    await uploadFileWithPaperclip(page, 'birthdays.pdf');
    await sendMessage(page, configuration, {
      message:
        'For each uploaded file, describe its content. For the PDF, provide a summary of its content. Present your response as a table with one column: "Content".',
    });
    const table = await page.waitForSelector('table', { timeout: 30000, state: 'visible' });
    expect(table).toBeDefined();
  });

  await test.step('should duplicate a conversation that includes a file uploaded with chat with files extension', async () => {
    const originalConversationWithTwoFiles = uniqueName('ChatWithTwoFilesDuplicationTest');

    await duplicateActiveConversation(page, originalConversationWithTwoFiles);
    const duplicatedName = `${originalConversationWithTwoFiles} (2)`;
    const duplicatedConversation = page.getByRole('navigation').filter({ hasText: duplicatedName });
    await expect(duplicatedConversation).toBeVisible();

    const fileChips = page.getByTestId('file-chip');
    await expect(fileChips.first()).toContainText('birthdays.pdf');
  });

  await test.step('should duplicate a conversation that includes a file uploaded with chat with files extension, delete the original file and show sources in the duplicated conversation', async () => {
    await newChat(page);
    await uploadFileWithPaperclip(page, 'birthdays.pdf');
    await sendMessage(page, configuration, {
      message: 'Hello.',
    });
    await page.waitForSelector('[data-testid="chat-item"]:nth-of-type(2)');

    const originalConversationName = uniqueName('SDup');

    await duplicateActiveConversation(page, originalConversationName);

    const originalConversation = page.getByRole('navigation').filter({ hasText: new RegExp(`^${originalConversationName}$`) });
    await originalConversation.click();
    await deleteFirstFileFromPaperclip(page);

    const duplicatedName = `${originalConversationName} (2)`;
    const duplicatedConversation = page.getByRole('navigation').filter({ hasText: duplicatedName });
    await expect(duplicatedConversation).toBeVisible();

    await duplicatedConversation.click();
    await page.waitForTimeout(1000);

    await sendMessage(page, configuration, {
      message: 'Welche Geburtstage stehen in der Datei?',
    });

    await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible();
    await page.getByTestId('sources-section').locator('a').getByText('birthdays.pdf').click();
    await page.waitForSelector(`:has-text("BirthdaySheet Daniel Düsentrieb Quack 02/07/2714 01/02/3456 Page 2")`);

    const source_panel = await page.waitForSelector(`:has-text("Source Content")`);
    expect(source_panel).toBeDefined();
  });
});
