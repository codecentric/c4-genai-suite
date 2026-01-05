import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { AppClient } from './apiAppClient';
import { Configuration, Middleware } from 'src/api/generated';

vi.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: vi.fn(() => Promise.resolve()),
}));

vi.mock('src/texts/i18n', () => ({
  i18next: {
    language: 'en',
    t: (key: string) => key,
  },
}));

vi.mock('src/texts', () => ({
  texts: {},
}));

describe('StreamApi', () => {
  let appClient: AppClient;
  let mockConfiguration: Configuration;
  let mockMiddleware: Middleware;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfiguration = new Configuration({
      basePath: 'http://localhost:3000',
    });
    mockMiddleware = {
      pre: vi.fn(async (context) => context),
      post: vi.fn(async (context) => context),
    };
    appClient = new AppClient(mockConfiguration, mockMiddleware);
  });

  it('should create and return an AbortController with the observable', () => {
    const result = appClient.stream.streamPrompt(1, { query: 'test query' });

    expect(result).toHaveProperty('observable');
    expect(result).toHaveProperty('abortController');
    expect(result.abortController).toBeInstanceOf(AbortController);
  });

  it('should pass AbortController signal to fetchEventSource', () => {
    const result = appClient.stream.streamPrompt(1, { query: 'test query' });

    // Subscribe to trigger the observable
    const subscription = result.observable.subscribe({
      next: () => {},
      error: () => {},
    });

    expect(fetchEventSource).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        signal: result.abortController.signal,
      }),
    );

    subscription.unsubscribe();
  });

  it('should use POST method for new messages', () => {
    const result = appClient.stream.streamPrompt(1, { query: 'test query' });

    const subscription = result.observable.subscribe({
      next: () => {},
      error: () => {},
    });

    expect(fetchEventSource).toHaveBeenCalledWith(
      'http://localhost:3000/api/conversations/1/messages/sse',
      expect.objectContaining({
        method: 'POST',
      }),
    );

    subscription.unsubscribe();
  });

  it('should use PUT method for editing messages', () => {
    const result = appClient.stream.streamPrompt(1, { query: 'test query' }, 42);

    const subscription = result.observable.subscribe({
      next: () => {},
      error: () => {},
    });

    expect(fetchEventSource).toHaveBeenCalledWith(
      'http://localhost:3000/api/conversations/1/messages/42/sse',
      expect.objectContaining({
        method: 'PUT',
      }),
    );

    subscription.unsubscribe();
  });

  it('should abort the fetch when AbortController.abort() is called', () => {
    const result = appClient.stream.streamPrompt(1, { query: 'test query' });

    const subscription = result.observable.subscribe({
      next: () => {},
      error: () => {},
    });

    expect(result.abortController.signal.aborted).toBe(false);

    result.abortController.abort();

    expect(result.abortController.signal.aborted).toBe(true);

    subscription.unsubscribe();
  });
});
