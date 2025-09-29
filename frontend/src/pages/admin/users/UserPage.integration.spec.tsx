import { userEvent } from '@testing-library/user-event';
import { afterAll, beforeAll, describe, it, vi } from 'vitest';
import { UserDto } from 'src/api';
import { texts } from 'src/texts';
import { server } from '../../../../mock/node';
import { render, screen } from '../test-utils';
import { UsersPage } from './UsersPage';

const generateMockUsers = (count: number): UserDto[] => {
  return Array.from(
    { length: count },
    (_, i): UserDto => ({
      id: i.toString(),
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      userGroupIds: ['default'],
      hasPassword: i % 2 === 0,
      hasApiKey: false,
    }),
  );
};

const mockUsers = generateMockUsers(50);

vi.mock('src/api', () => ({
  useApi: vi.fn(() => ({
    users: {
      getUsers: vi
        .fn()
        .mockResolvedValueOnce({
          items: mockUsers.slice(0, 20),
          total: mockUsers.length,
        })
        .mockResolvedValueOnce({
          items: mockUsers.slice(20, 40),
          total: mockUsers.length,
        }),
    },
  })),
}));

beforeAll(() => server.listen());
afterAll(() => server.close());

describe('UsersPage Integration Tests', () => {
  it('should return to page 1 after searching when on a page greater than 1', async () => {
    render(<UsersPage />);
    const user = userEvent.setup();

    // Ensure the initial page is 1
    await screen.findByText(texts.common.page(1, 3));

    // Navigate to the next page
    const buttonNext = screen.getByRole('button', { name: '»' });
    await user.click(buttonNext);
    await screen.findByText(texts.common.page(2, 3));

    // Perform a search
    const input = screen.getByPlaceholderText(texts.common.search);
    await user.type(input, 'U');

    // Wait for the search results to update, triggering a return to page 1
    await new Promise((resolve) => setTimeout(resolve, 500));
    await screen.findByText(texts.common.page(1, 3));
  });
});
