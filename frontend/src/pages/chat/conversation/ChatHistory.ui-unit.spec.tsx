import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../state/types';
import { ChatHistory } from './ChatHistory';

const mocks = vi.hoisted(() => ({
  messages: [] as ChatMessage[],
  renderMessage: vi.fn(),
  setSelectedDocument: vi.fn(),
  setSidebarRight: vi.fn(),
}));

vi.mock('../state/chat', () => ({
  useStateOfMessages: () => mocks.messages,
  useStateOfSelectedChatId: () => 42,
  useStateOfSelectedDocument: () => ({
    setSelectedDocument: mocks.setSelectedDocument,
  }),
}));

vi.mock('src/hooks/stored', () => ({
  useSidebarState: () => [false, mocks.setSidebarRight],
}));

vi.mock('./ChatItem/AIChatItem', () => ({
  AIChatItem: ({ message }: { message: ChatMessage }) => {
    mocks.renderMessage(message.id);
    return <div data-testid="chat-item">{message.id}</div>;
  },
}));

vi.mock('./ChatItem/HumanChatItem', () => ({
  HumanChatItem: ({ message }: { message: ChatMessage }) => {
    mocks.renderMessage(message.id);
    return <div data-testid="chat-item">{message.id}</div>;
  },
}));

describe('ChatHistory', () => {
  beforeEach(() => {
    mocks.messages = [message(1), message(2), message(3), message(4)];
    mocks.renderMessage.mockClear();
  });

  it('defers offscreen history and only rerenders changed messages', () => {
    const editMessage = vi.fn();
    const { rerender } = render(<ChatHistory agentName="Assistant" editMessage={editMessage} />);

    expect(screen.getAllByTestId('chat-item')).toHaveLength(4);
    expect(screen.getAllByTestId('deferred-chat-item')).toHaveLength(2);

    mocks.renderMessage.mockClear();
    mocks.messages = [...mocks.messages.slice(0, -1), message(4, 'updated')];
    rerender(<ChatHistory agentName="Assistant" editMessage={editMessage} />);

    expect(mocks.renderMessage).toHaveBeenCalledOnce();
    expect(mocks.renderMessage).toHaveBeenCalledWith(4);
  });
});

function message(id: number, text = `message ${id}`): ChatMessage {
  return {
    id,
    type: id % 2 === 0 ? 'ai' : 'human',
    configurationId: 1,
    content: [{ type: 'text', text }],
  };
}
