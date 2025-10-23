import { expect, test } from '@playwright/test';
import { config } from '../tests/utils/config';
import {
  addAzureModelToConfiguration,
  addSystemPromptToConfiguration,
  addUserArgsToConfiguration,
  createConfiguration,
  disableUserArgsInConfiguration,
  enterAdminArea,
  enterUserArea,
  expectA11yCompliant,
  login,
  newChat,
  resetFilter,
  selectConfiguration,
  sendMessage,
  setFilter,
} from '../tests/utils/helper';

type TUserArgs = {
  dateUserArgument: string;
  stringUserArgument: string;
  multiSelectUserArgument: string[];
  singleSelectUserArgument: string;
  dateRangeUserArgument: {
    from: string;
    until: string;
  };
};

if (!config.AZURE_OPEN_AI_API_KEY) {
  test.skip('should configure Azure OpenAI-Open AI LLM for chats [skipped due to missing API_KEY in env]', () => {});
} else {
  test('user args', async ({ page }) => {
    const configuration = { name: '', description: '' };
    const filter = {
      string: 'Test-String',
      date: '2024-03-12',
      dateFrom: '2025-01-01',
      dateUntil: '2025-12-31',
      singleSelect: 'value2',
      multiSelect: ['value3', 'value4', 'value5'],
    };

    await test.step('should login', async () => {
      await login(page);
    });

    await test.step('add assistant', async () => {
      configuration.name = `E2E-Test-User-Args-${Date.now()}`;
      configuration.description = `Description for ${configuration.name}`;
      await enterAdminArea(page);
      await createConfiguration(page, configuration);
    });

    await test.step('add model', async () => {
      await addAzureModelToConfiguration(page, configuration, { deployment: 'gpt-4o-mini' });
    });

    await test.step('add prompt', async () => {
      await addSystemPromptToConfiguration(page, configuration, { text: 'You are a helpful assistant.' });
    });

    await test.step('add user args extension', async () => {
      await addUserArgsToConfiguration(page, configuration);
    });

    await test.step('create new chat', async () => {
      await enterUserArea(page);
      await newChat(page);
    });

    await test.step('set filter', async () => {
      await selectConfiguration(page, configuration);

      await setFilter(page, filter);

      const dateSelector = await page.waitForSelector(`:has-text("Date: ${filter.date}")`);
      expect(dateSelector).toBeDefined();

      const stringSelector = await page.waitForSelector(`:has-text("String: ${filter.string}")`);
      expect(stringSelector).toBeDefined();

      const multiSelector = await page.waitForSelector(`:has-text("Multi Select: ${filter.multiSelect.join(', ')}")`);
      expect(multiSelector).toBeDefined();

      const singleSelector = await page.waitForSelector(`:has-text("Single Select: ${filter.singleSelect}")`);
      expect(singleSelector).toBeDefined();

      const dateRangeSelector = await page.waitForSelector(
        `:has-text("Date Range: (from: ${filter.dateFrom}, until: ${filter.dateUntil})")`,
      );
      expect(dateRangeSelector).toBeDefined();

      await expectA11yCompliant(page);
    });

    await test.step('send prompt', async () => {
      await sendMessage(page, configuration, { message: 'Give me the user arguments by executing a tool' });

      const markdownResponse = page.locator('.markdown').last();
      await markdownResponse.waitFor();

      const textContent = await markdownResponse.textContent();
      const result = JSON.parse(textContent || '') as TUserArgs;

      expect({
        dateUserArgument: filter.date,
        dateRangeUserArgument: {
          from: filter.dateFrom,
          until: filter.dateUntil,
        },
        singleSelectUserArgument: filter.singleSelect,
        multiSelectUserArgument: filter.multiSelect,
        stringUserArgument: filter.string,
      }).toStrictEqual(result);
    });

    await test.step('reset filter', async () => {
      await resetFilter(page);

      const dateSelector = await page.$(`:text-matches("Date:.*", "i")`);
      expect(dateSelector).toBeDefined();

      const stringSelector = await page.$(`:text-matches("String:.*", "i")`);
      expect(stringSelector).toBeDefined();

      const multiSelector = await page.waitForSelector(`:has-text("Multi Select: value2, value3")`);
      expect(multiSelector).toBeDefined();

      const singleSelector = await page.waitForSelector(`:has-text("Single Select: value4")`);
      expect(singleSelector).toBeDefined();

      const dateRangeSelector = await page.$(`:text-matches("Date Range:.*", "i")`);
      expect(dateRangeSelector).toBeDefined();
    });

    await test.step('send prompt after reset', async () => {
      await sendMessage(page, configuration, { message: 'Give me the user arguments by executing a tool' });

      const markdownResponse = page.locator('.markdown').last();
      await markdownResponse.waitFor();

      const textContent = await markdownResponse.textContent();
      const result = JSON.parse(textContent || '') as TUserArgs;

      expect({
        dateRangeUserArgument: {},
        singleSelectUserArgument: 'value4',
        multiSelectUserArgument: ['value2', 'value3'],
        stringUserArgument: '',
      }).toStrictEqual(result);
    });

    await test.step('hide filter if extension is deactivated', async () => {
      await enterAdminArea(page);
      await disableUserArgsInConfiguration(page, configuration);

      await enterUserArea(page);
      await newChat(page);
      await selectConfiguration(page, configuration);

      const filterButton = await page.$('button:has-text("Filter")');
      expect(filterButton).toBeNull();
      const filterChip = await page.$(`:text-matches("Date:.*", "i")`);
      expect(filterChip).toBeNull();
    });
  });
}
