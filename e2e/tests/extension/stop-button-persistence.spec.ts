import { expect, Locator } from '@playwright/test';
import { test } from '../utils/fixtures';
import {
  addMockModelToConfiguration,
  createConfiguration,
  enterAdminArea,
  enterUserArea,
  login,
  uniqueName,
} from '../utils/helper';

test('stopped response must not continue persisting after page refresh', async ({ page, mockServerUrl }) => {
  const configuration = { name: uniqueName('Stop-Persist-Test'), description: '' };
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

  const getPersistedAiText = async (conversationId: number) =>
    await page.evaluate(async (id) => {
      const response = await fetch(`/api-proxy/api/conversations/${id}/messages`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`Failed to load messages for conversation ${id}: ${response.status}`);
      }

      const data = (await response.json()) as {
        items: Array<{
          type: string;
          content: Array<{ type: string; text?: string }>;
        }>;
      };
      const aiMessages = data.items.filter((message) => message.type === 'ai');
      const latestAiMessage = aiMessages[aiMessages.length - 1];
      const textContent = latestAiMessage?.content.find((part) => part.type === 'text');
      return textContent?.text ?? null;
    }, conversationId);

  await test.step('should login and create assistant with mock model', async () => {
    await login(page);
    await enterAdminArea(page);
    configuration.description = `Example for the ${configuration.name}`;
    await createConfiguration(page, configuration);
    await addMockModelToConfiguration(page, configuration, { endpoint: mockServerUrl });
  });

  let conversationId = 0;
  let frozenText = '';

  await test.step('should stop a streaming response', async () => {
    await enterUserArea(page);
    const messageInput = page.getByPlaceholder(`Message ${configuration.name}`);

    await page.getByTestId('chat-assistent-select').click();
    await page.getByRole('option', { name: new RegExp(configuration.name) }).click();
    await expect(messageInput).toBeVisible();

    const submitButton = page.getByTestId('chat-submit-button');
    await messageInput.fill(longStreamingPrompt);
    await submitButton.click();

    await expect(page).toHaveURL(/\/chat\/\d+$/);
    conversationId = Number(page.url().split('/').pop());

    const aiMessage = page.getByTestId('chat-item').last();
    await expect(aiMessage).toContainText('STARTMARKER');

    await submitButton.click();
    await expect(submitButton.locator('svg.tabler-icon-x')).toHaveCount(0);

    frozenText = await getAiResponseText(aiMessage);
    await expect.poll(async () => await getAiResponseText(aiMessage)).toBe(frozenText);
  });

  await test.step('should not persist more tokens in the backend after stop', async () => {
    await expect.poll(async () => normalizeText(await getPersistedAiText(conversationId))).toBe(frozenText);
  });

  await test.step('should not show more tokens after refreshing the conversation', async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('chat-item')).toHaveCount(2);

    const refreshedAiMessage = page.getByTestId('chat-item').nth(1);
    expect(await getAiResponseText(refreshedAiMessage)).toBe(frozenText);
  });
});
