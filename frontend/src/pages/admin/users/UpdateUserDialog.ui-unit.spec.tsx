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
    userGroupIds: ['admin'],
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

    expect(screen.getByLabelText(required(texts.common.name))).toHaveValue(mockUser.name);
    expect(screen.getByLabelText(required(texts.common.email))).toHaveValue(mockUser.email);
    expect(document.querySelector('.mantine-Pill-label')).toHaveTextContent('Admin');
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

    expect(screen.getByText(texts.common.passwordsDoNotMatch)).toBeInTheDocument();
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

  it('should show the confirm dialog if the Admin user group is removed and there is an API key', async () => {
    render(<UpdateUserDialog {...defaultProps} />);

    const user = userEvent.setup();

    // Use base label without asterisk since the asterisk is aria-hidden
    const userGroup = screen.getByRole('textbox', { name: texts.common.userGroups });
    await user.click(userGroup);
    const adminOption = screen.getByRole('option', { name: /Admin/i });
    await user.click(adminOption); // Remove the Admin group.
    const defaultOption = screen.getByRole('option', { name: /Default/i });
    await user.click(defaultOption); // Add Default group.

    await user.click(screen.getByRole('button', { name: texts.common.save }));

    const confirmationDialog = screen.getByText(
      /Only users in the Admin user group can have an API key. The API key will be removed./i,
    );
    expect(confirmationDialog).toBeInTheDocument();
  });
});
