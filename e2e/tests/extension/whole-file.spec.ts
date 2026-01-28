import { expect, Locator } from '@playwright/test';
import { config } from '../utils/config';
import { test } from '../utils/fixtures';
import {
  addFilesInChatExtensionToConfiguration,
  addMockModelToConfiguration,
  addSystemPromptToConfiguration,
  addVisionFileExtensionToConfiguration,
  addWholeFileExtensionToConfiguration,
  createBucketIfNotExist,
  createConfiguration,
  deactivateFileInChatExtensionToConfiguration,
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

test('whole file extension', async ({ page, mockServerUrl }) => {
  let lastMessageOriginal: Locator;
  let originalConversationName: string | null;
  const conversationFilesBucket = globalConversationBucketName();

  const configuration = { name: '', description: '' };

  await test.step('should login', async () => {
    await login(page);
  });

  await test.step('add assistant', async () => {
    configuration.name = uniqueName('E2E-Whole-File');
    configuration.description = `Description for ${configuration.name}`;
    await enterAdminArea(page);
    await createConfiguration(page, configuration);
  });

  await test.step('add model', async () => {
    await addMockModelToConfiguration(page, configuration, { endpoint: mockServerUrl });
  });

  await test.step('add prompt', async () => {
    await addSystemPromptToConfiguration(page, configuration, { text: 'You are a helpful assistant.' });
  });

  await test.step('should add whole file extension to Assistant', async () => {
    await createBucketIfNotExist(page, {
      name: conversationFilesBucket,
      type: 'conversation',
      endpoint: config.REIS_ENDPOINT,
    });
    await addWholeFileExtensionToConfiguration(page, configuration, {
      bucketName: conversationFilesBucket,
    });
  });

  await test.step('should start chat in new configuration', async () => {
    await enterUserArea(page);
    await newChat(page);
    await selectConfiguration(page, configuration);
  });

  await test.step('should upload test file and reply to questions in the chat with file content', async () => {
    await uploadFileWithPaperclip(page, 'birthdays.pdf');
    await sendMessage(page, configuration, {
      message:
        'Wann hat Daniel Düsentrieb Geburtstag? Bitte nutze das Format "mm/dd/yyyy". Nutze nur Informationen aus der Datei und sage "Es steht nicht in der Datei", wenn du diese Information nicht in der Datei finden kannst.',
    });
    // the LLM might get the order of month and day wrong. But we test the file upload and not the LLM here
    const output_year = await page.waitForSelector(`:has-text("02/07/2714")`);
    expect(output_year).toBeDefined();

    await sendMessage(page, configuration, { message: 'Auf welcher Seite steht der Geburtstag von Düsentrieb?' });
    const output_page = await page.waitForSelector(`:has-text("Page 2")`);
    expect(output_page).toBeDefined();
  });

  await test.step('should replace file and reply to questions in the chat with second file content', async () => {
    await deleteFirstFileFromPaperclip(page);
    await uploadFileWithPaperclip(page, 'birthdays.pptx');
    await sendMessage(page, configuration, {
      message:
        'Wann hat Gladstone Gander Geburtstag? Bitte nutze das Format "mm/dd/yyyy". Nutze nur Informationen aus der Datei und sage "Es steht nicht in der Datei", wenn du diese Information nicht in der Datei finden kannst.',
    });
    const output_year = await page.waitForSelector(`:has-text("5/14/2001")`);
    expect(output_year).toBeDefined();
  });

  await test.step('should duplicate a conversation that includes a file uploaded with complete files extension', async () => {
    const lastMessageLocator = page.locator('[data-testid="chat-item"]').filter({ hasText: '5/14/2001' });
    lastMessageOriginal = lastMessageLocator.last();

    originalConversationName = uniqueName('ChatDuplicationTest');
    await duplicateActiveConversation(page, originalConversationName);
    await page.locator('text=Conversation duplicated successfully').waitFor({ state: 'visible' });

    const duplicatedName = `${originalConversationName} (2)`;
    const duplicatedConversation = page.getByRole('navigation').filter({ hasText: duplicatedName });
    await expect(duplicatedConversation).toBeVisible();
  });

  await test.step('should not reply to questions in the chat with first file content', async () => {
    await sendMessage(page, configuration, {
      message:
        'Wann hat Darkwing Duck Geburtstag? Bitte nutze das Format "mm/dd/yyyy". Nutze nur Informationen aus der Datei und sage "Es steht nicht in der Datei", wenn du diese Information nicht in der Datei finden kannst.',
    });
    const lastChatText = await page.locator('[data-testid="chat-item"]').last().innerText();
    expect(lastChatText).not.toContain('Darkwing Duck');
  });

  await test.step('should delete the second file and not answer with its content', async () => {
    await deleteFirstFileFromPaperclip(page);
    await sendMessage(page, configuration, {
      message:
        'Wann hat Gladstone Gander Geburtstag? Bitte nutze das Format "mm/dd/yyyy". Nutze nur Informationen aus der Datei und sage "Es steht nicht in der Datei", wenn du diese Information nicht in der Datei finden kannst.',
    });
    // does not contain the name
    const lastChatText = await page.locator('[data-testid="chat-item"]').last().innerText();
    expect(lastChatText).not.toContain('Gladstone Gander');
  });

  await test.step('change file size limit', async () => {
    await enterAdminArea(page);
    await editBucket(page, { name: conversationFilesBucket, fileSizeLimits: { general: 0 } });
  });

  await test.step('should reject large file', async () => {
    await enterUserArea(page);
    await newChat(page);
    await selectConfiguration(page, configuration);
    await uploadFileWithPaperclip(page, 'birthdays.pdf', true);
    await page
      .getByRole('alert')
      .filter({ hasText: /^Failed to upload file. 'birthdays.pdf': The file is larger than allowed for this file type./ })
      .click();
  });

  await test.step('should add vision extension to Assistant and be compatible', async () => {
    await enterAdminArea(page);
    await addVisionFileExtensionToConfiguration(page, configuration);
    await expect(page.getByTestId('incompatibleToolAlert')).toHaveCount(0);
  });

  await test.step('should add files in chat extension to Assistant and be incompatible', async () => {
    await addFilesInChatExtensionToConfiguration(page, configuration, {
      bucketName: conversationFilesBucket,
    });
    await expect(page.getByTestId('incompatibleToolAlert')).toHaveCount(1);
    await expect(page.getByTestId('incompatibleToolAlert')).toContainText(
      'You have incompatible tools: `Complete Files` and `Search Files in Chat`. Please choose one of the two types.',
    );
  });

  await test.step('should deactivate files in chat file extension and be compatible', async () => {
    await deactivateFileInChatExtensionToConfiguration(page, configuration);
    await expect(page.getByTestId('incompatibleToolAlert')).toHaveCount(0);
  });

  await test.step('should navigate to duplicated conversation with complete file extension', async () => {
    await enterUserArea(page);
    const duplicatedConversationLocator = page.getByRole('navigation').filter({
      hasText: `${originalConversationName} (2)`,
    });

    await expect(duplicatedConversationLocator, 'Duplicated conversation link should be visible').toBeVisible({
      timeout: 15000,
    });
    await duplicatedConversationLocator.click();
  });

  await test.step('should check if content of duplicated conversation with complete file extension match original conversation', async () => {
    const scrollButton = page.locator('button[data-testid="scrollToBottomButton"]');
    try {
      await scrollButton.waitFor({ state: 'visible', timeout: 5000 });
      await scrollButton.click();
    } catch {
      // Scroll button not visible, page is already at bottom
    }
    const lastChatItem = page.locator('[data-testid="chat-item"]').last();

    const aiName = 'Friendly AI';
    await expect(lastChatItem).toBeVisible({ timeout: 20000 });
    await expect(lastChatItem).toContainText(aiName);

    const lastMessageCopy = await lastChatItem.locator('.markdown').first().innerText();
    await expect(lastMessageOriginal).toContainText(lastMessageCopy);
  });
});
