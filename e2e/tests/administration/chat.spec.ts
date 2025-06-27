import { expect, test } from '@playwright/test';
import {
  checkSelectedConfiguration,
  cleanup,
  createConfiguration,
  enterUserArea,
  login,
  navigateToConfigurationAdministration,
  newChat,
  selectConfiguration,
} from '../utils/helper';

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
    await page.getByLabel(/^Name/).fill('Configuration without llm');
    await page.getByLabel(/^Description/).fill('A Simple Configuration without llm');
    await page.getByRole('button', { name: 'Save' }).click();
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
});
