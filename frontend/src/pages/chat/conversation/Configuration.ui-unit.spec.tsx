import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Configuration } from './Configuration';

// Mock the hooks with simple implementations
vi.mock('../../state/listOfAssistants', () => ({
  useStateOfAssistants: () => [
    { id: 1, name: 'GPT-4 Assistant', description: 'Advanced AI assistant' },
    { id: 2, name: 'Claude Assistant', description: 'Anthropic Claude assistant' },
    { id: 3, name: 'Code Assistant', description: 'Specialized for coding tasks' },
    { id: 4, name: 'General Assistant', description: 'General purpose assistant' },
  ],
  useStateOfSelectedAssistant: () => ({
    id: 1,
    name: 'GPT-4 Assistant',
    description: 'Advanced AI assistant',
  }),
  useUpdateLastSelectedAssistant: () => vi.fn(),
}));

vi.mock('../../state/chat', () => ({
  useStateMutateChat: () => ({ mutate: vi.fn() }),
  useStateOfChat: () => ({
    id: 123,
    configurationId: 1,
    createdAt: new Date(),
  }),
}));

vi.mock('../../../pages/utils', () => ({
  isMobile: () => false,
}));

// Create a test wrapper with all necessary providers
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Configuration Component - Assistant Selection Features', () => {
  const TestWrapper = createTestWrapper();

  it('renders assistant selection dropdown with current assistant selected', () => {
    render(
      <TestWrapper>
        <Configuration canEditConfiguration={true} />
      </TestWrapper>,
    );

    const select = screen.getByTestId('chat-assistent-select');
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('1'); // Should show current assistant ID
  });

  it('disables selection when canEditConfiguration is false', () => {
    render(
      <TestWrapper>
        <Configuration canEditConfiguration={false} />
      </TestWrapper>,
    );

    const select = screen.getByTestId('chat-assistent-select');
    expect(select).toBeDisabled();
  });
});
