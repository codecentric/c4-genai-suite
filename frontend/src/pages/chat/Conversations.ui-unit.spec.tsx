import { UseMutationResult } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { addDays, startOfDay } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';
import { ConversationDto } from 'src/api';
import { render } from 'src/pages/admin/test-utils';
import { ConversationItems } from './ConversationItems';
import { useStateOfChats } from './state/listOfChats';

vi.mock('src/api', () => ({
  useApi: () => ({}),
}));

function mockMutation<TData = unknown, TVariables = void>(): UseMutationResult<TData, Error, TVariables, unknown> {
  return {
    data: undefined,
    error: null,
    isError: false,
    isIdle: true,
    isPaused: false,
    isSuccess: false,
    status: 'idle',
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    reset: vi.fn(),
    variables: undefined,
    context: undefined,
    failureCount: 0,
    failureReason: null,
    isPending: false,
    submittedAt: 0,
  };
}

vi.mock('src/pages/chat/state/chat', () => ({
  useStateOfSelectedChatId: vi.fn(),
}));

vi.mock('src/pages/chat/state/listOfChats', () => ({
  useStateOfChats: vi.fn(),
  useListOfChats: vi.fn(),
  useStateMutateRenameChat: mockMutation,
  useMutateNewChat: vi.fn(),
  useStateMutateRemoveAllChats: mockMutation,
  useStateMutateDuplicateChat: mockMutation,
  useStateOfChatEmptiness: vi.fn(),
  useStateMutateRemoveChat: mockMutation,
}));

describe('Conversations', () => {
  const now = new Date();

  const mockedChats: ConversationDto[] = [
    { id: 1, createdAt: now, configurationId: 1 },
    { id: 4, createdAt: new Date('2023-10-01'), configurationId: 1 },
    { id: 3, createdAt: startOfDay(addDays(now, -20)), configurationId: 1 },
    { id: 2, createdAt: startOfDay(addDays(now, -2)), configurationId: 1 },
    { id: 5, createdAt: new Date('2022-10-01'), configurationId: 1 },
  ];

  it('should render conversations components sorted by date', () => {
    vi.mocked(useStateOfChats).mockImplementation(() => mockedChats);

    render(<ConversationItems />);

    const todayElement = screen.getByText('Today');
    const previous7DaysElement = screen.getByText('Previous 7 Days');
    const previous30DaysElement = screen.getByText('Previous 30 Days');
    const year2023Element = screen.getByText('2023');
    const year2022Element = screen.getByText('2022');

    expect(todayElement).toBeInTheDocument();
    expect(previous7DaysElement).toBeInTheDocument();
    expect(previous30DaysElement).toBeInTheDocument();
    expect(year2023Element).toBeInTheDocument();
    expect(year2022Element).toBeInTheDocument();

    // Today is above Previous 7 Days
    expect(todayElement.compareDocumentPosition(previous7DaysElement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Previous 7 Days is above Previous 30 Days
    expect(previous7DaysElement.compareDocumentPosition(previous30DaysElement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Previous 30 Days is above 2023
    expect(previous30DaysElement.compareDocumentPosition(year2023Element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // 2023 is above 2022
    expect(year2023Element.compareDocumentPosition(year2022Element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
