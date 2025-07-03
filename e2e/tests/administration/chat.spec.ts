import { expect, test } from '@playwright/test';
import {
  addImageToClipboard,
  addVisionFileExtensionToConfiguration,
  checkSelectedConfiguration,
  cleanup,
  createConfiguration,
  enterUserArea,
  login,
  navigateToConfigurationAdministration,
  newChat,
  selectConfiguration,
} from '../utils/helper';

const assistantName = 'Configuration without llm';

test('Chat', async ({ page }) => {
  await test.step('should login', async () => {
    await login(page);
    await cleanup(page);
  });

  await test.step('will navigate to configuration administration page', async () => {
    await navigateToConfigurationAdministration(page);
  });

  await test.step('should add empty configuration', async () => {
    await page.getByRole('link', { name: 'Assistants' }).click();
    await page
      .locator('*')
      .filter({ hasText: /^Assistants$/ })
      .getByRole('button')
      .click();
    await page.getByLabel(/^Name/).fill(assistantName);
    await page.getByLabel(/^Description/).fill('A Simple Configuration without llm');
    await page.getByRole('button', { name: 'Save' }).click();
  });

  await test.step('should add empty configuration', async () => {
    await addVisionFileExtensionToConfiguration(page, { name: assistantName });
  });

  await test.step('should upload avatar logo', async () => {
    await page.getByRole('link', { name: 'Theme' }).click();

    const parentElement = page.locator('.card').nth(1);
    const fileInput = parentElement.locator('input');
    await fileInput.setInputFiles(__dirname + '/../utils/files/react.svg');
    const saveButton = parentElement.locator('button:has-text("Save")');
    await saveButton.click();
  });

  await test.step('should show no-LLM-error', async () => {
    await enterUserArea(page);

    const userMessage = `Hello`;

    await page.locator('form').getByRole('textbox').fill(userMessage);
    await page.locator('form').getByTestId('chat-submit-button').click();
    const testoutput = await page.waitForSelector(`:has-text("No llm")`);
    expect(testoutput).toBeDefined();
  });

  await test.step('should add more configurations', async () => {
    await navigateToConfigurationAdministration(page);
    await createConfiguration(page, { name: 'Assistant', description: 'Assistant Description' });
    await createConfiguration(page, { name: 'Other Assistant', description: 'Other Assistant Description' });
    await enterUserArea(page);
  });

  await test.step('should select other assistant', async () => {
    await newChat(page);
    await selectConfiguration(page, { name: 'Other Assistant' });
  });

  await test.step('should keep other assistant selected on new chat', async () => {
    await newChat(page);
    await checkSelectedConfiguration(page, { name: 'Other Assistant' });
  });

  await test.step('should select assistant', async () => {
    await selectConfiguration(page, { name: 'Assistant' });
  });

  await test.step('should keep other assistant selected on new chat', async () => {
    await newChat(page);
    await checkSelectedConfiguration(page, { name: 'Assistant' });
  });

  await test.step('should should paste text', async () => {
    await page.locator('form').getByRole('textbox').focus();
    await page.keyboard.insertText('Two. ');
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('ControlOrMeta+X');

    await page.keyboard.insertText('One. ');
    await page.keyboard.press('ControlOrMeta+V');
    await page.keyboard.insertText('Three.');

    const testoutput = await page.waitForSelector(`:has-text("One. Two. Three.")`);
    expect(testoutput).toBeDefined();
  });

  await test.step('should paste images', async () => {
    await addImageToClipboard(page);

    await selectConfiguration(page, { name: assistantName });

    const fileChip = page.getByTestId('file-chip-uploaded');
    await expect(fileChip).not.toBeAttached();

    await page.keyboard.press('ControlOrMeta+V');

    await expect(fileChip).toBeAttached();
  });
});
