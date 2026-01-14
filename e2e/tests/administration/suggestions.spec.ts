import { expect, test } from '@playwright/test';
import {
  enterUserArea,
  login,
  navigateToConfigurationAdministration,
  navigateToThemeAdministration,
  newChat,
  selectConfiguration,
  selectOption,
} from '../utils/helper';

const MAX_SUGGESTIONS = 12;
const ASSISTANT_NAME = 'Assistant Suggestions';
const ASSISTANT_NAME_GLOBAL = 'Global Suggestions';

test('When using suggestions c4', async ({ page }) => {
  await test.step('will login', async () => {
    await login(page);
  });

  await test.step('will navigate to configuration administration page', async () => {
    await navigateToConfigurationAdministration(page);
  });

  await test.step('will ensure language is set to english', async () => {
    // This step is needed, since extremely fast saving of chances on the theme
    // page can glitch the language setting.
    // At human speeds this issue could not be reproduced.
    await navigateToThemeAdministration(page);
    await selectOption(page, 'language', /^Eng.+/);
    await page.getByRole('group').getByRole('button', { name: 'Save' }).click();
  });

  await test.step('will create empty assistant for global suggestions check', async () => {
    await page.getByRole('link', { name: 'Assistants' }).click();
    await page
      .locator('*')
      .filter({ hasText: /^Assistants$/ })
      .getByRole('button')
      .click();
    await page.getByLabel(/^Name/).fill(ASSISTANT_NAME_GLOBAL);
    await page.getByLabel(/^Description/).fill('without llm');
    await page.getByRole('button', { name: 'Save' }).click();
  });

  await test.step('will open create dialog for new assistant', async () => {
    await page.getByRole('link', { name: 'Assistants' }).click();
    await page
      .locator('*')
      .filter({ hasText: /^Assistants$/ })
      .getByRole('button')
      .click();
    await page.getByLabel(/^Name/).fill(ASSISTANT_NAME);
    await page.getByLabel(/^Description/).fill('without llm');
  });

  await test.step('will show the correct hint for assistant suggestions', async () => {
    await expect(page.getByText(`maximum of ${MAX_SUGGESTIONS} suggestions`)).toBeVisible();
  });

  await test.step('will allow adding the maximum amount of suggestions to an assistant', async () => {
    for (let i = 1; i <= MAX_SUGGESTIONS; i++) {
      await page.getByRole('button', { name: 'Add suggestion' }).click();
      await page
        .getByRole('textbox', { name: 'Title', exact: true })
        .nth(i - 1)
        .fill(`Title${i}`);
      await page
        .getByRole('textbox', { name: 'Text', exact: true })
        .nth(i - 1)
        .fill(`Suggested text ${i}`);
    }
  });

  await test.step('will not show the "Add suggestion" button if limit is reached for the assistant', async () => {
    await page.waitForTimeout(1000);
    await expect(page.getByRole('button', { name: 'Add suggestion' })).toBeHidden();
  });

  await test.step('will allow saving the maximum amount of assistant suggestions', async () => {
    await page.getByRole('button', { name: 'Save' }).click();
  });

  await test.step('will list saved suggestions in chat with correct assistant', async () => {
    await page.getByTestId('logo-link').click();
    await selectConfiguration(page, { name: ASSISTANT_NAME });
    for (let i = 1; i <= MAX_SUGGESTIONS; i++) {
      await page.getByText(`Title${i}Subtitle`).scrollIntoViewIfNeeded();
      await expect(page.getByText(`Title${i}Subtitle`)).toBeInViewport();
    }
    await page.getByText(`Title${MAX_SUGGESTIONS}Subtitle`).click();
    await expect(page.getByText(`Suggested text ${MAX_SUGGESTIONS}`)).toBeInViewport();
  });

  await test.step('will open global theme settings', async () => {
    await navigateToConfigurationAdministration(page);
    await navigateToThemeAdministration(page);
  });

  await test.step('will show the correct hint for global suggestions', async () => {
    await expect(page.getByText(`maximum of ${MAX_SUGGESTIONS} suggestions`)).toBeVisible();
  });

  await test.step('will allow adding a suggestion globally', async () => {
    const i = 1;
    await page.getByRole('button', { name: 'Add suggestion' }).waitFor();
    await page.getByRole('button', { name: 'Add suggestion' }).click();
    await page.fill(`input[placeholder='Title']`, `Global ${i}`);
    await page.fill(`input[placeholder='Subtitle']`, `Sub ${i}`);
    await page.fill(`textarea[placeholder='Text']`, `Text ${i}`);
  });

  await test.step('will allow saving and using the global suggestion', async () => {
    const i = 1;
    await page.getByRole('group').getByRole('button', { name: 'Save' }).click();
    await enterUserArea(page);
    await newChat(page);
    await selectConfiguration(page, { name: ASSISTANT_NAME });
    await page.getByText(`Global ${i}Sub ${i}`).click();
    await expect(page.getByText(`Text ${i}`)).toBeInViewport();
  });

  await test.step('will open global theme settings again', async () => {
    await navigateToConfigurationAdministration(page);
    await navigateToThemeAdministration(page);
  });

  await test.step('will allow adding the maximum amount of suggestions globally', async () => {
    await page.waitForTimeout(1000);
    for (let i = 2; i <= MAX_SUGGESTIONS; i++) {
      await page.getByRole('button', { name: 'Add suggestion' }).click();
      await page.fill(`input[placeholder='Title'] >> nth=${i - 1}`, `Global ${i}`);
      await page.fill(`input[placeholder='Subtitle'] >> nth=${i - 1}`, `Sub ${i}`);
      await page.fill(`textarea[placeholder='Text'] >> nth=${i - 1}`, `Text ${i}`);
    }
  });

  await test.step('will not show the "Add suggestion" button if limit is reached globally', async () => {
    await page.waitForTimeout(1000);
    await expect(page.getByRole('button', { name: 'Add suggestion' })).toBeHidden();
  });

  await test.step('will allow saving the maximum amount of global suggestions', async () => {
    await page.getByRole('group').getByRole('button', { name: 'Save' }).click();
  });

  await test.step('will list saved global suggestions in chat when using an assistant without suggestions', async () => {
    await enterUserArea(page);
    await newChat(page);
    await selectConfiguration(page, { name: ASSISTANT_NAME_GLOBAL });
    for (let i = 1; i <= MAX_SUGGESTIONS; i++) {
      await page.getByText(`Global ${i}Sub ${i}`).scrollIntoViewIfNeeded();
      await expect(page.getByText(`Global ${i}Sub ${i}`)).toBeInViewport();
    }
    await page.getByText(`Global ${MAX_SUGGESTIONS}Sub ${MAX_SUGGESTIONS}`).click();
    await expect(page.getByText(`Text ${MAX_SUGGESTIONS}`)).toBeInViewport();
  });

  await test.step('will list saved global suggestions in chat when using an assistant with suggestions', async () => {
    await page.getByRole('button', { name: 'New chat' }).click();
    await selectConfiguration(page, { name: ASSISTANT_NAME });
    for (let i = 1; i <= MAX_SUGGESTIONS; i++) {
      await page.getByText(`Global ${i}Sub ${i}`).scrollIntoViewIfNeeded();
      await expect(page.getByText(`Global ${i}Sub ${i}`)).toBeInViewport();
    }
    await page.getByText(`Global ${MAX_SUGGESTIONS}Sub ${MAX_SUGGESTIONS}`).click();
    await expect(page.getByText(`Text ${MAX_SUGGESTIONS}`)).toBeInViewport();
  });

  await test.step('will still list assistant suggestions next to global suggestions', async () => {
    await page.getByRole('button', { name: 'New chat' }).click();
    await selectConfiguration(page, { name: ASSISTANT_NAME });
    for (let i = 1; i <= MAX_SUGGESTIONS; i++) {
      await page.getByText(`Title${i}Subtitle`).scrollIntoViewIfNeeded();
      await expect(page.getByText(`Title${i}Subtitle`)).toBeInViewport();
    }
    await page.getByText(`Title${MAX_SUGGESTIONS}Subtitle`).click();
    await expect(page.getByText(`Suggested text ${MAX_SUGGESTIONS}`)).toBeInViewport();
  });
});
