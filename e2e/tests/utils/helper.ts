import path from 'path';
import AxeBuilder from '@axe-core/playwright';
import { expect, Locator, Page } from '@playwright/test';
import { config } from './config';

export async function login(page: Page, user?: { email: string; password: string }) {
  await page.goto(`${config.URL}/login`);
  await page.getByPlaceholder('Email').fill(user?.email ?? 'admin@example.com');
  await page.getByPlaceholder('Password').fill(user?.password ?? 'secret');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL(`${config.URL}/chat`);
  await page.getByTestId('menu user').waitFor({ state: 'visible' });
}

export async function goto(page: Page, relativePath: `/${string}` | '') {
  await page.goto(`${config.URL}${relativePath}`);
}

export async function enterAdminArea(page: Page) {
  if (await hasMenuItem(page, { name: 'Admin' })) {
    await page.getByRole('menuitem', { name: 'Admin' }).click();
  }
}

export async function logout(page: Page) {
  await page.getByTestId('menu user').click();
  await page.getByRole('menuitem', { name: 'Logout' }).click();
  await page.waitForURL(`${config.URL}/login`);
}

export async function hasMenuItem(page: Page, item: { name: string }) {
  await page.getByTestId('menu user').click();
  await page.waitForSelector('[role="menu"]');
  const locator = page.getByRole('menuitem', { name: item.name });
  return (await locator.count()) > 0;
}

export async function enterUserArea(page: Page) {
  if (await hasMenuItem(page, { name: 'Chat' })) {
    await page.getByRole('menuitem', { name: 'Chat' }).click();
  }
}

export async function newChat(page: Page) {
  await page.getByRole('button', { name: 'New chat' }).click();
  await page.waitForURL('**/chat/*');
  const welcomeText = page.getByText('How may I help you?');
  await welcomeText.waitFor();
}

export async function sendMessage(page: Page, configuration: { name: string }, content: { message: string }) {
  await page.getByPlaceholder(`Message ${configuration.name}`).fill(content.message);
  await page.locator('form').getByRole('button').last().click();
  // wait for the answer to arrive
  await page.waitForLoadState('networkidle', { timeout: 30000 });
}

async function save(page: Page, expectDetached = true) {
  const button = page.getByRole('button', { name: 'Save' });
  await button.click();
  if (expectDetached) {
    await button.waitFor({ state: 'detached' });
  }
}

export async function createConfiguration(
  page: Page,
  configuration: { name: string; description: string },
  expect: { detached: boolean } = { detached: true },
) {
  await page.getByRole('link', { name: 'Assistants' }).click();
  await page
    .locator('*')
    .filter({ hasText: /^Assistants$/ })
    .getByRole('button')
    .click();

  await page.getByLabel(/^Name/).fill(configuration.name);
  if (configuration.description) {
    await page.getByLabel(/^Description/).fill(`Example for the ${configuration.description}`);
  }

  await save(page, expect.detached);
}

export async function disableConfiguration(page: Page, configuration: { name: string; description: string }) {
  await page.getByRole('link', { name: 'Assistants' }).click();
  await page.locator('li').filter({ hasText: configuration.name }).getByTestId('more-actions').click();

  await page.click('button:has-text("Edit")');
  await page.locator('label').filter({ hasText: 'Enabled' }).locator('span').nth(2).click();
  await page.getByRole('button', { name: 'Save' }).click();
}

export async function deleteConfiguration(page: Page, configuration: { name: string; description: string }) {
  await page.getByRole('link', { name: 'Assistants' }).click();
  await page.locator('li').filter({ hasText: configuration.name }).getByTestId('more-actions').click();

  await page.click('button:has-text("Delete")');
  const confirmButton = page.locator('button:has-text("Confirm")');
  await page.click('button:has-text("Confirm")');
  await confirmButton.waitFor({ state: 'detached' });
}

async function deleteListItems(page: Page, filter: { label: string }) {
  // wait until the list is rendered (otherwise count might be falsely 0)
  await page.waitForLoadState('networkidle');
  await page.isVisible(`h3:has-text("${filter.label}")`);

  const entries = page.locator(`[aria-labelledby="${filter.label}"]`).getByRole('listitem').getByTestId('more-actions');
  const count = await entries.count();

  for (let i = 0; i < count; i++) {
    const element = entries.nth(0);
    await element.click();
    await page.click('button:has-text("Delete")');
    const confirmButton = page.locator('button:has-text("Confirm")');
    await page.click('button:has-text("Confirm")');
    await confirmButton.waitFor({ state: 'detached' });
  }
}

async function deleteConfigurations(page: Page) {
  await page.getByRole('link', { name: 'Assistants' }).click();
  await deleteListItems(page, { label: 'Assistants' });
}

async function deleteBuckets(page: Page) {
  await page.getByRole('link', { name: 'Files' }).click();
  await deleteListItems(page, { label: 'Buckets' });
}

export async function cleanup(page: Page) {
  await clearMessages(page);
  await enterAdminArea(page);
  await deleteConfigurations(page);
  await deleteBuckets(page);
  await enterUserArea(page);
}

export async function clearMessages(page: Page) {
  await page.getByTestId('menu user').click();
  await page.getByRole('menuitem', { name: 'Clear conversations' }).click();
  const confirm = page.getByRole('button', { name: 'Confirm deletion' });
  await confirm.click();
  await confirm.waitFor({ state: 'detached' });
}

export async function createBucket(
  page: Page,
  bucket: { name: string; indexName?: string; endpoint: string; type: 'user' | 'conversation' | 'general' },
) {
  await page.getByRole('link', { name: 'Files' }).click();

  await page
    .locator('*')
    .filter({ hasText: /^Buckets$/ })
    .getByRole('button')
    .click();
  await page.getByLabel(/^Name/).fill(bucket.name);
  await page.getByLabel(/^Endpoint/).fill(bucket.endpoint);
  await page.getByLabel(/^Index name/).fill(bucket.indexName ?? '');
  await selectOption(page, 'Bucket Type', bucket.type);
  await page.getByRole('button', { name: 'Test' }).click();
  await page
    .getByRole('alert')
    .filter({ hasText: /^Bucket is valid./ })
    .getByRole('button')
    .click();
  await save(page);
}

export async function deleteBucket(page: Page, bucket: { name: string }, ifExists = false) {
  await page.getByRole('link', { name: 'Files' }).click();

  const bucketMenu = page.locator('li').filter({ hasText: bucket.name }).getByTestId('more-actions');
  if (ifExists && !bucketMenu) {
    // in the case the bucket does not exist, we are done
    return;
  }
  await bucketMenu.click();
  await page.click('button:has-text("Delete")');
  await page.click('button:has-text("Confirm")');
}

export async function editBucket(
  page: Page,
  bucket: { name: string; endpoint?: string; fileSizeLimits?: Record<string, number> },
) {
  await page.getByRole('link', { name: 'Files', exact: true }).click();

  await page.locator('li').filter({ hasText: bucket.name }).getByTestId('more-actions').click();
  await page.click('button:has-text("Edit")');

  if (bucket.endpoint) {
    await page.getByLabel(/^Endpoint/).fill(bucket.endpoint);
  }

  if (bucket.fileSizeLimits) {
    // first, remove all
    const elements = page.getByTestId(/^fileSizeLimitsDynamic.\d+.remove$/);
    const count = await elements.count();
    for (let i = 0; i < count; i++) {
      await elements.nth(0).scrollIntoViewIfNeeded();
      await elements.nth(0).click();
    }
    await page.getByTestId('fileSizeLimitsGeneral.value').scrollIntoViewIfNeeded();

    if (bucket.fileSizeLimits.general != null) {
      await page.getByTestId('fileSizeLimitsGeneral.value').fill(bucket.fileSizeLimits.general.toFixed(1));
    }

    let i = 0;
    for (const [_, [k, v]] of Object.entries(bucket.fileSizeLimits).entries()) {
      if (k !== 'general') {
        await page.getByTestId(`fileSizeLimitsDynamic.add`).click();

        await page.getByTestId(`fileSizeLimitsDynamic.${i}.value`).scrollIntoViewIfNeeded();
        await page.getByTestId(`fileSizeLimitsDynamic.${i}.key`).fill(k);
        await page.getByTestId(`fileSizeLimitsDynamic.${i}.value`).fill(v.toFixed(1));
        ++i;
      }
    }
  }

  await page.getByRole('button', { name: 'Test' }).click();
  await page
    .getByRole('alert')
    .filter({ hasText: /^Bucket is valid./ })
    .getByRole('button')
    .click();
  await save(page);
}

export async function addBucketToConfiguration(
  page: Page,
  configuration: { name: string },
  files: { bucketName: string; description: string },
) {
  await page.getByRole('link', { name: 'Assistants' }).click();
  await page.getByRole('link', { name: configuration.name }).click();
  await page.getByRole('button', { name: 'Add Extension' }).click();
  await page.getByLabel('Create Extension').getByRole('tab', { name: 'Tools' }).click();
  await page.getByRole('heading', { name: 'Search Files', exact: true }).click();
  await page.getByLabel('Description').fill(files.description);
  await selectOption(page, 'Bucket', files.bucketName);
  await page.getByLabel('Take').fill('5');
  await save(page);
}

export async function addUserArgsToConfiguration(page: Page, configuration: { name: string }) {
  await page.getByRole('link', { name: 'Assistants' }).click();
  await page.getByRole('link').filter({ hasText: configuration.name }).click();
  await page.getByRole('button', { name: 'Add Extension' }).click();
  await page.getByLabel('Create Extension').getByRole('tab', { name: 'Tools' }).click();
  await page
    .locator('*')
    .filter({ hasText: /^DEV: User ArgsShows the current user argstool$/ })
    .nth(1)
    .click();
  await save(page);
}

export async function addMCPToConfiguration(
  page: Page,
  configuration: { name: string },
  mcp: { name: string; endpoint: string },
) {
  await page.getByRole('link', { name: 'Assistants' }).click();
  await page.getByRole('link').filter({ hasText: configuration.name }).click();
  await page.getByRole('button', { name: 'Add Extension' }).click();
  await page.getByLabel('Create Extension').getByRole('tab', { name: 'Tools' }).click();
  await page
    .locator('*')
    .filter({ hasText: /^MCP ToolsMCP Server Integrationtool$/ })
    .nth(1)
    .click();
  await page.getByLabel('Server Name').fill(mcp.name);
  await page.getByLabel('Endpoint').fill(mcp.endpoint);

  const refreshSchemaButton = page.getByRole('button', { name: 'Refresh Schema' });
  await refreshSchemaButton.waitFor({ state: 'visible' });
  await refreshSchemaButton.click();

  await refreshSchemaButton.waitFor({ state: 'hidden' });

  const checkboxes = await page.$$('input[type="checkbox"]');
  for (const checkbox of checkboxes) {
    await checkbox.check();
  }

  await save(page);
}

export async function disableUserArgsInConfiguration(page: Page, configuration: { name: string }) {
  await page.getByRole('link', { name: 'Assistants' }).click();
  await page.getByRole('link').filter({ hasText: configuration.name }).click();
  await page.getByTestId('sidebar-admin').getByRole('tab', { name: 'Tools' }).click();
  await page.getByRole('heading', { name: 'DEV: User Args', exact: true }).click();
  await page.getByRole('checkbox').uncheck();

  await save(page);
}

export async function addWholeFileExtensionToConfiguration(
  page: Page,
  configuration: { name: string },
  wholeFilesConfig: { bucketName: string },
) {
  await page.getByRole('link', { name: 'Assistants' }).click();
  await page.getByRole('link').filter({ hasText: configuration.name }).click();
  await page.getByRole('button', { name: 'Add Extension' }).click();
  await page.getByLabel('Create Extension').getByRole('tab', { name: 'Tools' }).click();
  await page.getByRole('heading', { name: 'Complete Files', exact: true }).click();
  await selectOption(page, 'Bucket', wholeFilesConfig.bucketName);

  await save(page);
}

export async function editWholeFileExtension(page: Page, configuration: { name: string }) {
  await page.getByRole('link', { name: 'Assistants' }).click();
  await page.getByRole('link').filter({ hasText: configuration.name }).click();
  await page.getByTestId('sidebar-admin').getByRole('tab', { name: 'Tools' }).click();
  await page.getByRole('heading', { name: 'Complete Files', exact: true }).click();

  await save(page);
}

export async function addImageToClipboard(page: Page) {
  await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('42', 50, 50);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve));
    if (blob) {
      const item = new ClipboardItem({
        [blob.type]: blob,
      });
      await navigator.clipboard.write([item]);
    }
  });
}

export async function addVisionFileExtensionToConfiguration(page: Page, configuration: { name: string }, matchName?: RegExp) {
  const name = matchName ?? configuration.name;
  await page.getByRole('link', { name: 'Assistants' }).click();
  await page.getByRole('link').filter({ hasText: name }).click();
  await page.getByRole('button', { name: 'Add Extension' }).click();
  await page.getByLabel('Create Extension').getByRole('tab', { name: 'Tools' }).click();
  await page.getByRole('heading', { name: 'Files Vision', exact: true }).click();

  await save(page);
}

export async function addFilesInChatExtensionToConfiguration(
  page: Page,
  configuration: { name: string },
  filesInChatConfig: { bucketName: string },
) {
  await page.getByRole('link', { name: 'Assistants' }).click();
  await page.getByRole('link').filter({ hasText: configuration.name }).click();
  await page.getByRole('button', { name: 'Add Extension' }).click();
  await page.getByLabel('Create Extension').getByRole('tab', { name: 'Tools' }).click();
  await page.getByRole('heading', { name: 'Search Files in Chat', exact: true }).click();
  await selectOption(page, 'Bucket', filesInChatConfig.bucketName);
  await page.getByRole('checkbox').first().check();

  await save(page);
}

export async function deactivateFileInChatExtensionToConfiguration(page: Page, configuration: { name: string }) {
  await page.getByRole('link', { name: 'Assistants' }).click();
  await page.getByRole('link').filter({ hasText: configuration.name }).click();
  await page.getByTestId('sidebar-admin').getByRole('tab', { name: 'Tools' }).click();
  await page.getByRole('heading', { name: 'Search Files in Chat', exact: true }).click();
  await page
    .locator('div')
    .filter({ hasText: /^Enabled$/ })
    .getByRole('checkbox')
    .uncheck();

  await save(page);
}

export async function resetFilter(page: Page) {
  await page.getByRole('button', { name: 'Filters' }).click();
  await page.getByRole('button', { name: 'Reset all' }).click();
  await page.getByRole('button', { name: 'Apply filter' }).click();
}

export async function setFilter(
  page: Page,
  filter: { date: string; string: string; multiSelect: string[]; singleSelect: string; dateFrom: string; dateUntil: string },
) {
  await page.getByRole('button', { name: 'Filters' }).click();
  await page.getByRole('textbox', { name: 'Date', exact: true }).fill(filter.date);
  await page.getByRole('textbox', { name: 'String', exact: true }).fill(filter.string);

  await resetOptions(page);
  await selectMultipleOptions(page, 'Multi Select', filter.multiSelect);
  await selectOption(page, 'Single Select', filter.singleSelect);
  await page.getByRole('textbox', { name: 'Date (from)', exact: true }).fill(filter.dateFrom);
  await page.getByRole('textbox', { name: 'Date (until)', exact: true }).fill(filter.dateUntil);
  await page.getByRole('button', { name: 'Apply filter' }).click();
}

export async function wait(timeout: number) {
  await new Promise((resolve) => setTimeout(resolve, timeout));
}

export async function addAzureModelToConfiguration(
  page: Page,
  configuration: { name: string },
  azure: { deployment: string; configurable?: string[]; apiKey?: string },
) {
  await page.getByRole('link', { name: 'Assistants' }).click();
  await page.getByRole('link').filter({ hasText: configuration.name }).click();

  await page.getByRole('button', { name: 'Add Extension' }).click();

  await page
    .locator('*')
    .filter({ hasText: /^Azure OpenAIOpen AI LLM integration.*$/ })
    .nth(1)
    .click();
  await page.getByLabel('API Key').click();
  await page.getByLabel('API Key').fill(azure.apiKey ?? config.AZURE_OPEN_AI_API_KEY);
  await page.getByLabel('Deployment Name').fill(azure.deployment);
  await page.getByLabel('Instance Name').fill('cccc-testing');
  await page.getByLabel('Seed').fill('42');
  await page.getByLabel('Temperature').fill('0');
  await page.getByRole('button', { name: 'Test' }).click();
  const loader = page.locator('.mantine-Button-loader');
  await loader.waitFor({ state: 'visible' });

  if (azure.configurable?.length) {
    await selectMultipleOptions(page, 'Configurable', azure.configurable);
  }

  await page
    .getByRole('alert')
    .filter({ hasText: /^Extension is valid./ })
    .getByRole('button')
    .click();

  await loader.waitFor({ state: 'detached' });

  await save(page);
}

export async function configureAssistantByUser(page: Page, config: { values: { label: string; value: number | string }[] }) {
  await page.getByTestId('assistent-user-configuration').click();

  for (const entry of config.values) {
    await page.getByLabel(entry.label).fill(String(entry.value));
  }
  await page.getByRole('button', { name: 'Save' }).click();
}

export async function addSystemPromptToConfiguration(
  page: Page,
  configuration: { name: string },
  prompt: { title?: string; text: string; configurable?: boolean },
) {
  await page.getByRole('link', { name: 'Assistants' }).click();
  await page.getByRole('link').filter({ hasText: configuration.name }).click();

  await page.getByRole('button', { name: 'Add Extension' }).click();

  await page.getByLabel('Create Extension').getByRole('tab', { name: 'Other' }).click();

  await page.getByRole('heading', { name: 'Prompt', exact: true }).click();
  await page.getByLabel('Title').fill(prompt.title ?? 'systemprompt');
  await page.getByLabel('Text').fill(prompt.text);

  if (prompt.configurable) {
    await selectMultipleOptions(page, 'Configurable', ['Text']);
  }

  await save(page);
}

export async function addOllamaModelToConfiguration(page: Page, configuration: { name: string }, ollama: { model: string }) {
  await page.getByRole('link', { name: 'Assistants' }).click();
  await page.getByRole('link').filter({ hasText: configuration.name }).click();

  await page.getByRole('button', { name: 'Add Extension' }).click();

  await page
    .locator('*')
    .filter({ hasText: /^DEV: OllamaOllama LLM integrationllm$/ })
    .nth(1)
    .click();
  await page.getByLabel('Endpoint').fill('host.docker.internal:11434');
  await page.getByLabel('Model Name').fill(ollama.model);

  await page.getByRole('button', { name: 'Test' }).click();
  await page
    .getByRole('alert')
    .filter({ hasText: /^Extension is valid./ })
    .getByRole('button')
    .click();

  await save(page);
}

export async function checkSelectedConfiguration(page: Page, configuration: { name: string }) {
  const selectedAssistant = page.locator(`input[value="${configuration.name}"]`);
  await selectedAssistant.waitFor();
  await expect(selectedAssistant.first()).toBeVisible();
}

export async function selectConfiguration(page: Page, configuration: { name: string }) {
  await page.getByTestId('chat-assistent-select').click();
  const element = page.locator('p').getByText(configuration.name, { exact: true });
  await expect(element).toBeVisible();
  await element.click();
  await page.waitForLoadState('networkidle');
}

export async function navigateToUserAdministration(page: Page) {
  await page.getByRole('link', { name: 'Users' }).waitFor();
  await page.getByRole('link', { name: 'Users' }).click();
  await page.waitForURL(`${config.URL}/admin/users`);
}

export async function navigateToUserGroupAdministration(page: Page) {
  await page.getByRole('link', { name: 'Groups' }).waitFor();
  await page.getByRole('link', { name: 'Groups' }).click();
  await page.waitForURL(`${config.URL}/admin/user-groups`);
}

export async function navigateToThemeAdministration(page: Page) {
  await page.getByRole('link', { name: 'Theme' }).waitFor();
  await page.getByRole('link', { name: 'Theme' }).click();
  await page.waitForURL(`${config.URL}/admin/theme`);
}

export async function createUser(page: Page, user: { email: string; name: string; password?: string }) {
  await navigateToUserAdministration(page);

  const adminCell = page.getByRole('cell', { name: 'Admin', exact: true });
  await adminCell.last().waitFor();

  const oldUsersCount = await page.getByRole('table').getByRole('row').count();

  await page.getByRole('button', { name: 'Create User' }).click();
  await page.getByLabel('Name').click();
  await page.getByLabel('Name').fill(user.name);
  await page.getByLabel('Email').click();
  await page.getByLabel('Email').fill(user.email);
  if (user.password != null) {
    await page.locator('#password').click();
    await page.locator('#password').fill(user.password);
    await page.locator('#passwordConfirm').click();
    await page.locator('#passwordConfirm').fill(user.password);
  }

  await page.getByRole('button', { name: 'Save' }).click();

  const createUserModal = page.getByRole('heading', { name: 'Create User' });
  await createUserModal.waitFor({ state: 'detached' });

  const newUsersCount = await page.getByRole('table').getByRole('row').count();
  expect(newUsersCount).toEqual(oldUsersCount + 1);
  const newUser = page.getByRole('table').getByRole('row').filter({ hasText: user.name });
  await expect(newUser).toHaveCount(1);
}

export async function uploadFileWhileInChat(page: Page, filename: string, mayFail: boolean = false) {
  // Yes, this seems strange at first, but ...
  // - if we ran `page.waitForEvent('filechooser')` after clicking, we
  //   would miss the event caused by the click.
  // - if we would `await` the file chooser event right away, execution
  //   would get stuck before we could click anything to trigger the event.
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByText('Drag and drop files here, or click to select files.').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.join(__dirname, `files/${filename}`));

  if (!mayFail) {
    // the filename followed by 2 numbers from the upload date is checked to confirm the upload completed
    const regex = new RegExp(`${filename}\\d{2}`);
    await page.getByText(regex).click();
  }
}

export async function uploadFileWithPaperclip(page: Page, filename: string, mayFail: boolean = false) {
  // Yes, this seems strange at first, but ...
  // - if we ran `page.waitForEvent('filechooser')` after clicking, we
  //   would miss the event caused by the click.
  // - if we would `await` the file chooser event right away, execution
  //   would get stuck before we could click anything to trigger the event.
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.locator('label[for="file-upload"]').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.join(__dirname, `files/${filename}`));

  if (!mayFail) {
    await expect(page.getByTestId('file-chip-uploaded').first()).toContainText(filename);
  }
}

export async function deleteFirstFileFromPaperclip(page: Page) {
  const fileChip = page.getByTestId('file-chip').first();
  await fileChip.locator('button').click();
}

export async function navigateToConfigurationAdministration(page: Page) {
  await page.getByTestId('menu user').waitFor();
  await page.getByTestId('menu user').click();
  await page.getByRole('menuitem', { name: 'Admin' }).waitFor();
  await page.getByRole('menuitem', { name: 'Admin' }).click();
  await page.getByRole('link', { name: 'Assistants' }).waitFor();
  await page.getByRole('link', { name: 'Assistants' }).click();
  await page.waitForURL(`${config.URL}/admin/assistants`);
}

async function resetOptions(page: Page) {
  const removeButton = page
    .locator('div')
    .filter({ hasText: /^Multi Selectvalue.*$/ })
    .locator('button');
  while (true) {
    const count = await removeButton.count();
    if (count === 0) {
      return;
    }

    await removeButton.first().click();
  }
}

export async function duplicateLastCreatedConversation(page: Page) {
  // sometimes there are races between renaiming of the conversation and duplicating it, as a workaround, we wait
  await page.waitForTimeout(1000);
  await page.locator('svg.tabler-icon-dots').first().click();
  const dropdown = page.locator('.mantine-Menu-dropdown');
  await expect(dropdown).toBeVisible();
  await dropdown.locator('text=Duplicate').click();
  await page.locator('text=Conversation duplicated successfully').locator('button').click();
}

export async function selectOption(page: Page, name: string, value: string | RegExp) {
  await page.getByRole('textbox', { name: name }).click();
  if (typeof value === 'string') {
    await page.getByRole('option', { name: value, exact: true }).click();
  } else {
    await page.getByRole('option', { name: value }).click();
  }
}

export async function selectMultipleOptions(page: Page, name: string, values: string[]) {
  await page.getByRole('textbox', { name: name }).click();
  for (const value of values) {
    await page.getByRole('option', { name: value, exact: true }).click();
  }
  await page.getByRole('textbox', { name: name }).click();
}

export async function expectElementInYRange(element: Locator, min: number, max: number) {
  const box = await element.boundingBox();
  const highestPointY = box && box.y;
  const lowestPointY = box && box.y + box.height;
  expect(highestPointY).toBeGreaterThan(min);
  expect(lowestPointY).toBeLessThan(max);
}

export async function changePassword(page: Page, currentPassword: string, newPassword: string) {
  await page.getByRole('textbox', { name: 'Current Password', exact: true }).waitFor();
  await page.getByRole('textbox', { name: 'Current Password', exact: true }).fill(currentPassword);
  await page.getByRole('textbox', { name: 'Password', exact: true }).click();
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(newPassword);
  await page.getByRole('textbox', { name: 'Confirm Password', exact: true }).click();
  await page.getByRole('textbox', { name: 'Confirm Password', exact: true }).fill(newPassword);
  await page.getByRole('button', { name: 'Update Password' }).click({ timeout: 3000 });
}

export async function expectA11yCompliant(page: Page, exceptions: any[] = []) {
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual(exceptions);
}
