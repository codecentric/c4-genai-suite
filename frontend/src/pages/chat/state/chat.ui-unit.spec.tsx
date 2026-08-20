import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStateOfIsAiWriting } from './chat';
import { useChatStore } from './zustand/chatStore';

describe('chat state selectors', () => {
  beforeEach(() => {
    useChatStore.setState({
      currentChatId: 0,
      chatDataMap: new Map(),
      selectedDocument: undefined,
      selectedSource: undefined,
    });
  });

  it('does not rerender isAiWriting subscribers for message-only updates', () => {
    act(() => {
      useChatStore.getState().switchToChat(1);
      useChatStore.getState().setIsAiWriting(1, true);
    });

    const renderValue = vi.fn();
    render(<IsAiWritingSubscriber renderValue={renderValue} />);
    renderValue.mockClear();

    act(() => {
      useChatStore.getState().setMessages(1, [
        {
          id: 1,
          type: 'ai',
          configurationId: 1,
          content: [{ type: 'text', text: 'updated response' }],
        },
      ]);
    });

    expect(renderValue).not.toHaveBeenCalled();

    act(() => {
      useChatStore.getState().setIsAiWriting(1, false);
    });

    expect(renderValue).toHaveBeenCalledOnce();
    expect(renderValue).toHaveBeenCalledWith(false);
  });
});

function IsAiWritingSubscriber({ renderValue }: { renderValue: (value: boolean) => void }) {
  const isAiWriting = useStateOfIsAiWriting();
  renderValue(isAiWriting);
  return null;
}
