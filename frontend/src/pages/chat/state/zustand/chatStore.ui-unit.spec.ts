import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { Subscription } from 'rxjs';
import { useChatStore } from './chatStore';

describe('chatStore - cancel functionality', () => {
  beforeEach(() => {
    // Reset store state before each test
    useChatStore.getState().chatDataMap = new Map();
  });

  afterEach(() => {
    // Clean up after each test
    useChatStore.getState().chatDataMap.clear();
  });

  it('should store and retrieve AbortController', () => {
    const chatId = 1;
    const abortController = new AbortController();

    useChatStore.getState().initializeChatIfNeeded(chatId);
    useChatStore.getState().setActiveAbortController(chatId, abortController);

    const chatData = useChatStore.getState().chatDataMap.get(chatId);
    expect(chatData?.activeAbortController).toBe(abortController);
  });

  it('should abort HTTP connection and unsubscribe when cancelActiveStream is called', () => {
    const chatId = 1;

    // Create mock subscription and abort controller
    const mockUnsubscribe = vi.fn();
    const mockSubscription = {
      unsubscribe: mockUnsubscribe,
    } as unknown as Subscription;

    const abortController = new AbortController();
    const abortSpy = vi.spyOn(abortController, 'abort');

    // Setup chat with active stream
    useChatStore.getState().initializeChatIfNeeded(chatId);
    useChatStore.getState().setActiveStreamSubscription(chatId, mockSubscription);
    useChatStore.getState().setActiveAbortController(chatId, abortController);
    useChatStore.getState().setIsAiWriting(chatId, true);
    useChatStore.getState().setStreamingMessageId(chatId, 123);

    // Cancel the stream
    useChatStore.getState().cancelActiveStream(chatId);

    // Verify abort was called
    expect(abortSpy).toHaveBeenCalledOnce();

    // Verify unsubscribe was called
    expect(mockUnsubscribe).toHaveBeenCalledOnce();

    // Verify state was cleaned up
    const chatData = useChatStore.getState().chatDataMap.get(chatId);
    expect(chatData?.activeStreamSubscription).toBeUndefined();
    expect(chatData?.activeAbortController).toBeUndefined();
    expect(chatData?.isAiWriting).toBe(false);
    expect(chatData?.streamingMessageId).toBeUndefined();
  });

  it('should not throw error when cancelActiveStream is called without active stream', () => {
    const chatId = 1;

    useChatStore.getState().initializeChatIfNeeded(chatId);

    // Should not throw
    expect(() => useChatStore.getState().cancelActiveStream(chatId)).not.toThrow();
  });

  it('should handle cancelActiveStream when only subscription exists (no abort controller)', () => {
    const chatId = 1;

    const mockUnsubscribe = vi.fn();
    const mockSubscription = {
      unsubscribe: mockUnsubscribe,
    } as unknown as Subscription;

    useChatStore.getState().initializeChatIfNeeded(chatId);
    useChatStore.getState().setActiveStreamSubscription(chatId, mockSubscription);
    useChatStore.getState().setIsAiWriting(chatId, true);

    // Cancel without abort controller
    useChatStore.getState().cancelActiveStream(chatId);

    expect(mockUnsubscribe).toHaveBeenCalledOnce();

    const chatData = useChatStore.getState().chatDataMap.get(chatId);
    expect(chatData?.isAiWriting).toBe(false);
  });

  it('should clear abort controller on stream completion', () => {
    const chatId = 1;
    const abortController = new AbortController();

    useChatStore.getState().initializeChatIfNeeded(chatId);
    useChatStore.getState().setActiveAbortController(chatId, abortController);

    // Simulate stream completion
    useChatStore.getState().setActiveAbortController(chatId, undefined);

    const chatData = useChatStore.getState().chatDataMap.get(chatId);
    expect(chatData?.activeAbortController).toBeUndefined();
  });

  it('should maintain abort controller for multiple chats independently', () => {
    const chatId1 = 1;
    const chatId2 = 2;

    const abortController1 = new AbortController();
    const abortController2 = new AbortController();

    useChatStore.getState().initializeChatIfNeeded(chatId1);
    useChatStore.getState().initializeChatIfNeeded(chatId2);

    useChatStore.getState().setActiveAbortController(chatId1, abortController1);
    useChatStore.getState().setActiveAbortController(chatId2, abortController2);

    // Verify each chat has its own abort controller
    expect(useChatStore.getState().chatDataMap.get(chatId1)?.activeAbortController).toBe(abortController1);
    expect(useChatStore.getState().chatDataMap.get(chatId2)?.activeAbortController).toBe(abortController2);

    // Cancel only chat 1
    const mockSubscription1 = {
      unsubscribe: vi.fn(),
    } as unknown as Subscription;
    useChatStore.getState().setActiveStreamSubscription(chatId1, mockSubscription1);
    useChatStore.getState().cancelActiveStream(chatId1);

    // Verify only chat 1 was affected
    expect(useChatStore.getState().chatDataMap.get(chatId1)?.activeAbortController).toBeUndefined();
    expect(useChatStore.getState().chatDataMap.get(chatId2)?.activeAbortController).toBe(abortController2);
  });
});
