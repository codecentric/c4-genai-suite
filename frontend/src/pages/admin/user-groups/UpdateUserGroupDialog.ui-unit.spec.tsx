import { screen } from '@testing-library/react';
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

  it('should open update dialog with provided user group data', () => {
    render(<UpdateUserGroupDialog {...defaultProps} />);

    expect(screen.getByLabelText(required(texts.common.groupName))).toHaveValue(mockUserGroup.name);
    expect(screen.getByLabelText(texts.common.monthlyTokens)).toBeInTheDocument();
    expect(screen.getByLabelText(texts.common.monthlyUserTokens)).toBeInTheDocument();
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

    expect(document.querySelectorAll('.mantine-InputWrapper-error')).toHaveLength(1);
  });
});
