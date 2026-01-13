import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserGroupDto } from 'src/api';
import { texts } from 'src/texts';
import { server } from '../../../../mock/node';
import { apiBaseUrl, render, required } from '../test-utils';
import { CreateUserDialog, CreateUserProps } from './UpsertUserDialog';

describe('CreateUserDialog', () => {
  beforeAll(() => server.listen());
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

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

  const defaultProps: Omit<CreateUserProps, 'type'> = {
    userGroups: mockUserGroups,
    onCreate: vi.fn(),
    onClose: vi.fn(),
  };

  it('should call onCreate with created user info', async () => {
    const newUserName = 'new user name';
    render(<CreateUserDialog {...defaultProps} />);
    server.use(
      http.post(`${apiBaseUrl}/*`, () => {
        return HttpResponse.json({ name: newUserName });
      }),
    );

    const user = userEvent.setup();
    const nameInput = screen.getByLabelText(required(texts.common.name));
    await user.clear(nameInput);
    await user.type(nameInput, newUserName);
    const email = screen.getByLabelText(required(texts.common.email));
    await user.type(email, 'John@Johnson.com');

    const saveButton = screen.getByRole('button', { name: texts.common.save });
    await user.click(saveButton);

    expect(defaultProps.onCreate).toHaveBeenCalledWith({ name: newUserName });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
  it('should display an error message on response 500', async () => {
    render(<CreateUserDialog {...defaultProps} />);
    server.use(
      http.post(`${apiBaseUrl}/users`, () => {
        return new Response(null, { status: 500 });
      }),
    );

    const user = userEvent.setup();
    const username = screen.getByLabelText(required('Name'));
    await user.type(username, 'John Johnson');
    const email = screen.getByLabelText(required(texts.common.email));
    await user.type(email, 'John@Johnson.com');

    const saveButton = screen.getByRole('button', { name: texts.common.save });
    await user.click(saveButton);

    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });
});
