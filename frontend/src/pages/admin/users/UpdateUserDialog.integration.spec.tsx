import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { http } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserDto, UserGroupDto } from 'src/api';
import { texts } from 'src/texts';
import { server } from '../../../../mock/node';
import { apiBaseUrl, render, required } from '../test-utils';
import { UpdateUserDialog, UpdateUserProps } from './UpsertUserDialog';

describe('UpdateUserDialog', () => {
  beforeAll(() => server.listen());
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  const mockUser: UserDto = {
    id: '1',
    name: 'tester',
    email: 'testuser@example.com',
    userGroupId: 'admin',
    hasApiKey: false,
    hasPassword: false,
  };

  const mockUserGroups: UserGroupDto[] = [
    { id: 'admin', name: 'Admin', isAdmin: true, isBuiltIn: true, monthlyTokens: 0, monthlyUserTokens: 0 },
    {
      id: 'default',
      name: 'Default',
      isAdmin: false,
      isBuiltIn: true,
      monthlyTokens: 0,
      monthlyUserTokens: 0,
    },
  ];

  const defaultProps: Omit<UpdateUserProps, 'type'> = {
    target: mockUser,
    userGroups: mockUserGroups,
    onClose: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
  };

  it('should call onUpdate with updated user info', async () => {
    const newUserName = 'new user name';

    render(<UpdateUserDialog {...defaultProps} />);

    const user = userEvent.setup();
    const nameInput = screen.getByLabelText(required(texts.common.name));
    await user.clear(nameInput);
    await user.type(nameInput, newUserName);

    const saveButton = screen.getByRole('button', { name: texts.common.save });
    await user.click(saveButton);

    expect(defaultProps.onUpdate).toHaveBeenCalledWith(expect.objectContaining({ name: newUserName }));
    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.onDelete).not.toHaveBeenCalled();
  });
  it('should call onDelete with user id that was deleted', async () => {
    render(<UpdateUserDialog {...defaultProps} />);

    const user = userEvent.setup();
    const deleteButton = screen.getByRole('button', { name: texts.common.remove });
    await user.click(deleteButton);

    const confirmButton = screen.getByRole('button', { name: texts.common.remove });
    await user.click(confirmButton);

    const yesButton = screen.getByRole('button', { name: texts.common.confirm });
    await user.click(yesButton);

    expect(defaultProps.onDelete).toHaveBeenCalledWith(mockUser.id);
    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.onUpdate).not.toHaveBeenCalled();
  });
  it('should display an error message on response 500', async () => {
    render(<UpdateUserDialog {...defaultProps} />);
    server.use(
      http.put(`${apiBaseUrl}/users/*`, () => {
        return new Response(null, { status: 500 });
      }),
    );

    const user = userEvent.setup();
    const saveButton = screen.getByRole('button', { name: texts.common.save });
    await user.click(saveButton);

    expect(await screen.findAllByRole('alert')).toHaveLength(1);
  });
});
