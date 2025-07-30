import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UserDto, UserGroupDto } from 'src/api';
import { texts } from 'src/texts';
import { render, required } from '../test-utils';
import { UpdateUserDialog, UpdateUserProps } from './UpsertUserDialog';

describe('UpdateUserDialog', () => {
  const mockUser: UserDto = {
    id: '1',
    name: 'tester',
    email: 'testuser@example.com',
    userGroupId: 'admin',
    hasPassword: false,
    hasApiKey: true,
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

  it('should open update dialog with provided user data', () => {
    render(<UpdateUserDialog {...defaultProps} />);

    const [first, ...other] = mockUser.userGroupId;

    expect(screen.getByLabelText(required(texts.common.name))).toHaveValue(mockUser.name);
    expect(screen.getByLabelText(required(texts.common.email))).toHaveValue(mockUser.email);
    expect(screen.getByLabelText(required(texts.common.userGroup))).toHaveValue(`${first.toUpperCase()}${other.join('')}`);
  });

  it('should generate a random API Key', async () => {
    render(<UpdateUserDialog {...defaultProps} />);

    const user = userEvent.setup();
    const generateButton = screen.getByRole('button', { name: texts.users.generateAPIKey });
    await user.click(generateButton);
    const apiKeyInput = screen.getByRole('textbox', { name: texts.common.apiKey });
    await waitFor(() => expect(apiKeyInput).toHaveValue());
  });

  it('should warn if confirm password does not match', async () => {
    render(<UpdateUserDialog {...defaultProps} />);

    const user = userEvent.setup();
    const password = screen.getByLabelText(texts.common.password);
    await user.type(password, 'secret');

    const confirmPassword = screen.getByLabelText(texts.common.passwordConfirm);
    await user.type(confirmPassword, 'not so secret');

    await user.click(screen.getByRole('button', { name: texts.common.save }));

    expect(screen.getByRole('alert')).toHaveTextContent(texts.common.passwordsDoNotMatch);
  });

  it('should call onClose when cancel button is clicked', async () => {
    render(<UpdateUserDialog {...defaultProps} />);

    const user = userEvent.setup();
    const cancelButton = screen.getByRole('button', { name: texts.common.cancel });
    await user.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.onDelete).not.toHaveBeenCalled();
    expect(defaultProps.onUpdate).not.toHaveBeenCalled();
  });

  it('should show the confirm dialog when user group change from admin to default and there is a api key', async () => {
    render(<UpdateUserDialog {...defaultProps} />);

    const user = userEvent.setup();

    const userGroup = screen.getByLabelText(required(texts.common.userGroup));
    await user.click(userGroup);
    const defaultOption = screen.getByRole('option', { name: /Default/i });
    await user.click(defaultOption);

    await user.click(screen.getByRole('button', { name: texts.common.save }));

    const confirmationDialog = screen.getByText(
      /Only users in the Admin User Group can have an API key. The API key will be removed./i,
    );
    expect(confirmationDialog).toBeInTheDocument();
  });
});
