import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'src/pages/admin/test-utils';
import { ChatPage } from './ChatPage';

vi.mock('src/pages/chat/state/listOfAssistants', () => ({
  useListOfEnabledAssistantsInit: vi.fn(),
  useListOfAllAssistantsInit: vi.fn(),
}));

vi.mock('./state/listOfChats', () => ({
  useListOfChatsInit: vi.fn(),
  useMutateNewChat: () => ({ mutate: vi.fn() }),
  useStateMutateRemoveAllChats: () => ({ mutate: vi.fn() }),
  useStateOfChatEmptiness: () => vi.fn(),
}));

vi.mock('./state/chat', () => ({
  useStateOfSelectedAssistantId: () => undefined,
  useStateOfSelectedChatId: () => undefined,
  useStateOfSelectedDocument: () => ({ selectedDocument: undefined, setSelectedDocument: vi.fn() }),
  useStateOfSelectedSource: () => ({ selectedSource: undefined, setSelectedSource: vi.fn() }),
}));

vi.mock('./useUserBucket', () => ({
  useUserBucket: () => ({ userBucket: undefined }),
}));

vi.mock('src/hooks/api/files', () => ({
  useConversationFiles: () => ({ clear: vi.fn() }),
}));

vi.mock('src/components', () => ({
  CollapseButton: () => null,
  ProfileButton: () => null,
}));

vi.mock('src/components/NavigationBar', () => ({
  NavigationBar: () => null,
}));

vi.mock('src/components/PdfViewer', () => ({
  PdfViewer: () => null,
}));

vi.mock('./ConversationItems', () => ({
  ConversationItems: () => null,
}));

vi.mock('./NewChatRedirect', () => ({
  NewChatRedirect: () => null,
}));

vi.mock('./SourcesChunkPreview', () => ({
  SourcesChunkPreview: () => null,
}));

vi.mock('./conversation/ConversationPage', () => ({
  ConversationPage: () => null,
}));

vi.mock('./files/Files', () => ({
  Files: () => null,
}));

vi.mock('react-resizable-panels', () => ({
  Group: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Separator: () => null,
}));

describe('ChatPage', () => {
  it('should have a main landmark for accessibility', () => {
    render(<ChatPage />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
