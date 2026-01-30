import { expect } from '@playwright/test';
import { test } from '../utils/fixtures';
import {
  addMockModelToConfiguration,
  addSystemPromptToConfiguration,
  configureAssistantByUser,
  createConfiguration,
  enterAdminArea,
  enterUserArea,
  login,
  newChat,
  save,
  selectConfiguration,
  sendMessage,
  uniqueName,
} from '../utils/helper';

test('configurable arguments', async ({ page, mockServerUrl }) => {
  const configuration = { name: '', description: '' };

  await test.step('should login', async () => {
    await login(page);
  });

  await test.step('add assistant', async () => {
    configuration.name = uniqueName('E2E-Test-Configurable-Arguments');
    configuration.description = `Description for ${configuration.name}`;
    await enterAdminArea(page);
    await createConfiguration(page, configuration);
  });

  await test.step('add model', async () => {
    await addMockModelToConfiguration(page, configuration, {
      endpoint: mockServerUrl,
    });
  });

  await test.step('add prompt', async () => {
    await addSystemPromptToConfiguration(page, configuration, { text: 'You are a helpful assistant.', configurable: true });
  });

  await test.step('create new chat', async () => {
    await enterUserArea(page);
    await newChat(page);
    await selectConfiguration(page, configuration);
  });

  await test.step('create configuration', async () => {
    await configureAssistantByUser(page, {
      values: [{ label: 'Text', value: 'Speak like a pirate and always mention that your parrot died.' }],
    });
  });

  await test.step('send prompt', async () => {
    await sendMessage(page, configuration, { message: 'What is the capital of Germany?' });
    const testoutput = await page.waitForSelector(`:has-text("parrot")`);
    expect(testoutput).toBeDefined();
  });

  await test.step('verify configurable argument is listed on assistant page', async () => {
    await enterAdminArea(page);
    await page.getByRole('link', { name: 'Assistants' }).click();
    await page.getByRole('link').filter({ hasText: configuration.name }).click();

    await expect(page.getByText('Text', { exact: true })).toBeVisible();
  });

  await test.step('remove configurable argument from extension', async () => {
    await page.getByRole('tab', { name: 'Other' }).click();
    await page.getByLabel('Other').getByRole('heading', { name: 'Prompt' }).click();

    const configurableInput = page.getByTestId('configurableArguments');
    await expect(configurableInput.getByText('Text')).toBeVisible();

    await configurableInput.locator('.mantine-Pill-remove').click();

    await expect(configurableInput.getByText('Text')).not.toBeVisible();

    await save(page);
  });

  await test.step('verify configurable argument is not listed anymore', async () => {
    await expect(page.getByText('Text', { exact: true })).not.toBeVisible();
  });
});
