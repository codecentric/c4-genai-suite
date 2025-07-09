import { faker } from '@faker-js/faker';
import { expect, test } from '@playwright/test';
import { cleanup, goToWelcomePage, login } from '../utils/helper';

const configName = faker.commerce.productName();
const configDescription = faker.commerce.productDescription();
const configNewName = faker.commerce.productName();
const apiKey = '1234567890';

test('Configuration Management', async ({ page }) => {
  await test.step('should login', async () => {
    await login(page);
    await cleanup(page);
    await goToWelcomePage(page);
  });

  await test.step('should add a new assistant when login the first time', async () => {
    await page.getByRole('link', { name: 'Setup an Assistant' }).click();
    await expect(page).toHaveURL(/\/admin\/assistants\?create/);
    await page.getByRole('textbox', { name: 'Name' }).fill(configName);
    await page.getByRole('textbox', { name: 'Description' }).fill(configDescription);
    await page.getByRole('button', { name: 'Save' }).click();

    await page.getByRole('dialog', { name: 'Create Extension' }).getByRole('button').click();

    const createConfigurationModal = page.getByRole('heading', { name: 'Create Configuration' });

    await createConfigurationModal.waitFor({ state: 'detached' });
    const newConfigurations = page.getByRole('link', { name: configName });
    await expect(newConfigurations).toBeVisible();
  });

  await test.step('edit a configuration', async () => {
    await page.getByRole('link', { name: configName, exact: true }).click();
    await page.locator('li').filter({ hasText: configName }).getByTestId('more-actions').click();
    await page.getByText('Duplicate').waitFor();
    await page.getByText('Edit').click();
    await page.getByLabel('Name').fill(configNewName);
    await page.getByRole('button', { name: 'Save' }).click();

    const createConfigurationModal = page.getByRole('heading', { name: 'Update Configuration' });
    await createConfigurationModal.waitFor({ state: 'detached' });

    const configurationName = await page
      .getByRole('list', { name: 'assistants' })
      .getByRole('listitem')
      .getByText(configNewName)
      .textContent();
    expect(configurationName).toEqual(configNewName);
  });

  await test.step('alert when configuration name is empty', async () => {
    await page
      .locator('div')
      .filter({ hasText: /^Assistants$/ })
      .getByRole('button')
      .click();
    await page.getByRole('button', { name: 'Save' }).click();

    expect(page.getByRole('alert', { name: 'Name is a required field' })).toBeDefined();
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  await test.step('create an extension', async () => {
    await page.getByRole('list', { name: 'assistants' }).getByRole('listitem').filter({ hasText: configNewName }).click();

    await page.getByRole('heading', { name: 'Extensions' }).waitFor();
    await page.getByRole('button', { name: 'Add Extension' }).first().click();
    await page
      .locator('div')
      .filter({ hasText: /^OpenAIOpen AI LLM integrationllm$/ })
      .first()
      .click();
    await page.getByLabel('API Key').click();
    await page.getByLabel('API Key').fill(apiKey);
    await page.getByLabel('Model').fill('gpt-3.5-turbo');

    await page.getByRole('button', { name: 'Save' }).click();

    await page.getByRole('list', { name: 'extensionList' }).waitFor();

    const extensions = page.getByRole('list', { name: 'extensionList' });
    await expect(extensions).toHaveCount(1);
  });

  await test.step('should edit the extension', async () => {
    await page.getByRole('list', { name: 'extensionList' }).getByRole('listitem').first().click();
    await page.getByLabel('Model').fill('gpt-4-0613');
    await page.getByRole('button', { name: 'Save' }).click();

    const updateExtensionModal = page.getByRole('heading', { name: 'Update Extension' });
    await updateExtensionModal.waitFor({ state: 'detached' });

    const values = page.getByTestId('modelValues');
    await expect(values).toHaveText('gpt-4-0613');
  });

  await test.step('alert when API Key is empty and Model field is not selected with an option', async () => {
    await page.getByRole('list', { name: 'assistants' }).getByRole('listitem').filter({ hasText: configNewName }).click();
    await page.getByRole('button', { name: 'Add Extension' }).first().click();
    await page.getByRole('group').getByRole('heading', { name: 'OpenAI', exact: true }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    expect(page.getByRole('alert', { name: 'API Key is a required field' })).toBeDefined();
    expect(page.getByRole('alert', { name: 'Model is a required field' })).toBeDefined();

    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  await test.step('alert when there are more than one model', async () => {
    await page.getByRole('list', { name: 'assistants' }).getByRole('listitem').filter({ hasText: configNewName }).click();

    await page.getByRole('heading', { name: 'Extensions' }).waitFor();
    await page.getByRole('button', { name: 'Add Extension' }).first().click();
    await page
      .locator('div')
      .filter({ hasText: /^OpenAIOpen AI LLM integrationllm$/ })
      .first()
      .click();
    await page.getByLabel('API Key').click();
    await page.getByLabel('API Key').fill(apiKey);
    await page.getByLabel('Model').fill('gpt-3.5-turbo');
    await page.getByRole('button', { name: 'Save' }).click();

    await page.getByLabel('extensionList').waitFor();
    const getAlert = page.getByRole('alert');

    await expect(getAlert).toHaveText(
      'You have more than one model enabled, the first model will be chosen by default for new chats.',
    );
  });

  await test.step('should delete the extension', async () => {
    const extensionToBeDeleted = page.getByRole('list', { name: 'extensionList' }).getByRole('listitem').first();
    await extensionToBeDeleted.click();

    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();

    const updateExtensionModal = page.getByRole('heading', { name: 'Update Extension' });
    await updateExtensionModal.waitFor({ state: 'detached' });
    await page.getByLabel('extensionList').waitFor();

    const deletedRows = page
      .getByRole('list', { name: 'extensionList' })
      .getByRole('listitem')
      .filter({ hasText: (await extensionToBeDeleted.textContent()) || '' });
    await expect(deletedRows).toHaveCount(1);
  });

  await test.step('delete a configuration', async () => {
    const configList = page.getByRole('list', { name: 'assistants' });

    const configToBeDeleted = configList.getByRole('link', { name: configNewName, exact: true });
    await configToBeDeleted.click();

    await page.locator('li').filter({ hasText: configNewName }).getByTestId('more-actions').click();
    await page.getByText('Delete').click();
    await page.getByRole('button', { name: 'Confirm' }).click();

    const createConfigurationModal = page.getByRole('heading', { name: 'Remove Configuration' });
    await createConfigurationModal.waitFor({ state: 'detached' });

    const editedRows = configList.filter({ hasText: configNewName });
    await expect(editedRows).toHaveCount(0);
  });
});
