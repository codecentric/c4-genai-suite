import { expect, test } from '@playwright/test';
import {
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
    const currentPage = page.url();
    await page.goto(
      'data:image/png;base64,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',
    );
    await page.keyboard.press('ControlOrMeta+C');
    await page.goto(currentPage);
    await selectConfiguration(page, { name: assistantName });

    const fileChip = page.getByTestId('file-chip-uploaded');
    await expect(fileChip).not.toBeAttached();

    await page.keyboard.press('ControlOrMeta+V');

    await expect(fileChip).toBeAttached();
  });
});
