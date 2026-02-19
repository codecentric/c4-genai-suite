import { faker } from '@faker-js/faker';
import { expect, test } from '@playwright/test';
import { cleanup, login, navigateToConfigurationAdministration } from '../utils/helper';

const configName = faker.commerce.productName();
const configDescription = faker.commerce.productDescription();
const configNewName = faker.commerce.productName();
const apiKey = '1234567890';

test('Configuration Management', async ({ page }) => {
  await test.step('should login', async () => {
    await login(page);
    await cleanup(page);
  });

  await test.step('will navigate to configuration administration page', async () => {
    await navigateToConfigurationAdministration(page);
  });

  await test.step('create a configuration', async () => {
    await page.getByRole('button', { name: 'Create assistant' }).click();
    await page.getByLabel('Name').click();
    await page.getByLabel('Name').fill(configName);
    await page.getByLabel('Description').click();
    await page.getByLabel('Description').fill(configDescription);

    await page.getByRole('button', { name: 'Save' }).click();
    const createConfigurationModal = page.getByRole('heading', { name: 'Create Configuration' });

    await createConfigurationModal.waitFor({ state: 'detached' });
    const newConfigurations = page.getByRole('link', { name: configName });
    await expect(newConfigurations).toBeVisible();
  });

  await test.step('edit a configuration', async () => {
    await page.getByRole('link', { name: configName, exact: true }).click();
    await page.locator('li').filter({ hasText: configName }).getByTestId('more-actions').click();
    await page.getByRole('button', { name: 'Duplicate' }).waitFor();
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Name').fill(configNewName);
    await page.getByRole('button', { name: 'Save' }).click();

    const createConfigurationModal = page.getByRole('heading', { name: 'Update Configuration' });
    await createConfigurationModal.waitFor({ state: 'detached' });

    const configurationName = await page.getByLabel('assistants').getByRole('listitem').getByText(configNewName).textContent();
    expect(configurationName).toEqual(configNewName);
  });

  await test.step('alert when configuration name is empty', async () => {
    await page.getByRole('button', { name: 'Create assistant' }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    expect(page.getByRole('alert', { name: 'Name is a required field' })).toBeDefined();
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  await test.step('create an extension', async () => {
    await page.getByLabel('assistants').getByRole('listitem').filter({ hasText: configNewName }).click();

    await page.getByRole('heading', { name: 'Extensions' }).waitFor();
    await page.getByRole('button', { name: 'Add Extension' }).click();
    await page
      .locator('div')
      .filter({ hasText: /^OpenAIOpen AI LLM integrationllm$/ })
      .first()
      .click();
    await page.getByLabel('API Key').click();
    await page.getByLabel('API Key').fill(apiKey);
    await page.getByLabel('Model Name').fill('gpt-3.5-turbo');

    await page.getByRole('button', { name: 'Save' }).click();

    await page.getByLabel('extensionList').waitFor();

    const extensions = page.getByLabel('extensionList');
    await expect(extensions).toHaveCount(1);
  });

  await test.step('should edit the extension', async () => {
    await page.getByLabel('extensionList').getByRole('listitem').first().click();
    await page.getByLabel('Model Name').fill('gpt-4-0613');
    await page.getByRole('button', { name: 'Save' }).click();

    const updateExtensionModal = page.getByRole('heading', { name: 'Update Extension' });
    await updateExtensionModal.waitFor({ state: 'detached' });

    const values = page.getByTestId('modelValues');
    await expect(values).toHaveText('gpt-4-0613');
  });

  await test.step('alert when API Key is empty and Model field is not selected with an option', async () => {
    await page.getByLabel('assistants').getByRole('listitem').filter({ hasText: configNewName }).click();
    await page.getByRole('button', { name: 'Add Extension' }).click();
    await page.getByRole('group').getByRole('heading', { name: 'OpenAI', exact: true }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    expect(page.getByRole('alert', { name: 'API Key is a required field' })).toBeDefined();
    expect(page.getByRole('alert', { name: 'Model is a required field' })).toBeDefined();

    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  await test.step('alert when there are more than one model', async () => {
    await page.getByLabel('assistants').getByRole('listitem').filter({ hasText: configNewName }).click();

    await page.getByRole('heading', { name: 'Extensions' }).waitFor();
    await page.getByRole('button', { name: 'Add Extension' }).click();
    await page
      .locator('div')
      .filter({ hasText: /^OpenAIOpen AI LLM integrationllm$/ })
      .first()
      .click();
    await page.getByLabel('API Key').click();
    await page.getByLabel('API Key').fill(apiKey);
    await page.getByLabel('Model Name').fill('gpt-3.5-turbo');
    await page.getByRole('button', { name: 'Save' }).click();

    await page.getByLabel('extensionList').waitFor();
    const getAlert = page.getByRole('tabpanel', { name: 'models' }).getByRole('alert');

    await expect(getAlert).toHaveText(
      'You have more than one model enabled, the first model will be chosen by default for new chats.',
    );
  });

  await test.step('should delete the extension', async () => {
    const extensionToBeDeleted = page.getByLabel('extensionList').getByRole('listitem').first();
    await extensionToBeDeleted.click();

    await page.getByLabel('Update Extension').getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();

    const updateExtensionModal = page.getByRole('heading', { name: 'Update Extension' });
    await updateExtensionModal.waitFor({ state: 'detached' });
    await page.getByLabel('extensionList').waitFor();

    const deletedRows = page
      .getByLabel('extensionList')
      .getByRole('listitem')
      .filter({ hasText: (await extensionToBeDeleted.textContent()) || '' });
    await expect(deletedRows).toHaveCount(1);
  });

  await test.step('delete a configuration', async () => {
    const configList = page.getByLabel('assistants');

    const configToBeDeleted = configList.getByRole('link', { name: configNewName, exact: true });
    await configToBeDeleted.click();

    await page.locator('li').filter({ hasText: configNewName }).getByTestId('more-actions').click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();

    const createConfigurationModal = page.getByRole('heading', { name: 'Remove Configuration' });
    await createConfigurationModal.waitFor({ state: 'detached' });

    const editedRows = configList.filter({ hasText: configNewName });
    await expect(editedRows).toHaveCount(0);
  });
});
