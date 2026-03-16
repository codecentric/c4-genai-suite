import { expect, Locator } from '@playwright/test';
import { test } from '../utils/fixtures';
import {
  addMockModelToConfiguration,
  createConfiguration,
  enterAdminArea,
  enterUserArea,
  login,
  selectConfiguration,
  uniqueName,
} from '../utils/helper';

test('stop button cancels active streaming response', async ({ page, mockServerUrl }) => {
  const configuration = { name: uniqueName('Stop-Button-Test'), description: '' };
  const longStreamingPrompt = 'stop-button-stream-test';

  const normalizeText = (value: string | null) => (value ?? '').replace(/\s+/g, ' ').trim();
  const extractStreamText = (value: string | null) => {
    const normalizedValue = normalizeText(value);
    const markerIndex = normalizedValue.indexOf('STARTMARKER');
    return markerIndex === -1 ? normalizedValue : normalizedValue.slice(markerIndex);
  };
  const getAiResponseText = async (itemLocator: Locator) => {
    return extractStreamText(await itemLocator.locator('.markdown').textContent());
  };

  await test.step('should login', async () => {
    await login(page);
  });

  await test.step('should create assistant with mock model', async () => {
    await enterAdminArea(page);
    configuration.description = `Example for the ${configuration.name}`;
    await createConfiguration(page, configuration);
    await addMockModelToConfiguration(page, configuration, { endpoint: mockServerUrl });
  });

  await test.step('should start streaming and show stop button', async () => {
    await enterUserArea(page);
    await selectConfiguration(page, configuration);

    await page.getByPlaceholder(`Message ${configuration.name}`).fill(longStreamingPrompt);
    const submitButton = page.getByTestId('chat-submit-button');
    await submitButton.click();

    await expect(submitButton.locator('svg.tabler-icon-x')).toBeVisible();
    await expect(page.getByTestId('chat-item').last()).toContainText('STARTMARKER');
  });

  await test.step('should stop streaming when stop button is clicked', async () => {
    const submitButton = page.getByTestId('chat-submit-button');
    const aiMessage = page.getByTestId('chat-item').last();

    await submitButton.click();

    await expect(submitButton.locator('svg.tabler-icon-x')).toHaveCount(0);

    const textAfterStop = await getAiResponseText(aiMessage);
    await expect.poll(async () => await getAiResponseText(aiMessage)).toBe(textAfterStop);
    await expect(aiMessage).not.toContainText('ENDMARKER');
  });

  await test.step('should keep first stopped response frozen after sending another prompt', async () => {
    const submitButton = page.getByTestId('chat-submit-button');
    const firstAiMessage = page.getByTestId('chat-item').nth(1);
    const frozenFirstMessage = await getAiResponseText(firstAiMessage);

    await page.getByPlaceholder(`Message ${configuration.name}`).fill('answer to life, the universe and everything');
    await submitButton.click();
    await expect(page.getByTestId('chat-item').last()).toContainText('42');

    const firstMessageAfterSecondPrompt = await getAiResponseText(firstAiMessage);
    expect(firstMessageAfterSecondPrompt).toBe(frozenFirstMessage);
    await expect(firstAiMessage).not.toContainText('ENDMARKER');
  });
});
