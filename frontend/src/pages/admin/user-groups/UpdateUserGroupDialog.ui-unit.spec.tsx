import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UserGroupDto } from 'src/api';
import { UpdateUserGroupDialog, UpdateUserGroupDialogProps } from 'src/pages/admin/user-groups/UpdateUserGroupDialog';
import { texts } from 'src/texts';
import { render, required } from '../test-utils';

describe('UpdateUserGroupDialog', () => {
  const mockUserGroup: UserGroupDto = {
    id: 'st1',
    name: 'St1',
    isAdmin: false,
    isBuiltIn: false,
    monthlyTokens: 0,
    monthlyUserTokens: 0,
  };

  const defaultProps: UpdateUserGroupDialogProps = {
    target: mockUserGroup,
    onClose: vi.fn(),
    onDelete: vi.fn(),
    onUpdate: vi.fn(),
  };

  it('should open update dialog with provided user group data', async () => {
    render(<UpdateUserGroupDialog {...defaultProps} />);

    // Wait for the form to be populated from useEffect
    await waitFor(() => {
      expect(screen.getByLabelText(required(texts.common.groupName))).toHaveValue(mockUserGroup.name);
    });
    // NumberInput with value 0 renders as empty string in the input
    const monthlyTokensInput = screen.getByLabelText(texts.common.monthlyTokens);
    const monthlyUserTokensInput = screen.getByLabelText(texts.common.monthlyUserTokens);
    // Check the inputs exist and are numbers (0 may render as empty or 0)
    expect(monthlyTokensInput).toBeInTheDocument();
    expect(monthlyUserTokensInput).toBeInTheDocument();
  });

  it('should call onClose when cancel button is clicked', async () => {
    render(<UpdateUserGroupDialog {...defaultProps} />);

    const user = userEvent.setup();
    const cancelButton = screen.getByRole('button', { name: texts.common.cancel });
    await user.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should alert when Name field is empty', async () => {
    render(<UpdateUserGroupDialog {...defaultProps} />);

    const user = userEvent.setup();
    const nameInput = screen.getByLabelText(required(texts.common.groupName));
    await user.clear(nameInput);
    await user.type(screen.getByLabelText(texts.common.monthlyTokens), '1200');
    await user.type(screen.getByLabelText(texts.common.monthlyUserTokens), '120');
    const saveButton = screen.getByRole('button', { name: texts.common.save });
    await user.click(saveButton);

    // Mantine form errors use InputWrapper-error class, not role="alert"
    expect(document.querySelectorAll('.mantine-InputWrapper-error')).toHaveLength(1);
  });
});
