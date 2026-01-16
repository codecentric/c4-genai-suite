import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { texts } from 'src/texts';
import { server } from '../../../../mock/node';
import { apiBaseUrl, render, required } from '../test-utils';
import { CreateUserGroupDialog, CreateUserGroupDialogProps } from './CreateUserGroupDialog';

describe('User Page', () => {
  const defaultProps: CreateUserGroupDialogProps = {
    onClose: vi.fn(),
    onCreate: vi.fn(),
  };

  it('should alert when Name field is empty', async () => {
    render(<CreateUserGroupDialog onCreate={() => {}} onClose={() => {}} />);

    const user = userEvent.setup();
    const saveBtn = screen.getByRole('button', { name: 'Save' });
    await user.click(saveBtn);
    expect(document.querySelectorAll('.mantine-InputWrapper-error')).toHaveLength(1);
  });

  it('should alert when monthly tokens goes below zero', async () => {
    render(<CreateUserGroupDialog onCreate={() => {}} onClose={() => {}} />);

    const user = userEvent.setup();
    const nameInput = screen.getByLabelText(required(texts.common.groupName));
    await user.click(nameInput);
    await user.type(nameInput, 'st1');
    const monthlyTokenInput = screen.getByLabelText('Monthly tokens');
    await user.click(monthlyTokenInput);
    await user.type(monthlyTokenInput, '-1');
    const saveBtn = screen.getByRole('button', { name: 'Save' });
    await user.click(saveBtn);
    expect(document.querySelectorAll('.mantine-InputWrapper-error')).toHaveLength(1);
  });

  it('should alert when monthly tokens/user goes below zero', async () => {
    render(<CreateUserGroupDialog onCreate={() => {}} onClose={() => {}} />);

    const user = userEvent.setup();
    const nameInput = screen.getByLabelText(required(texts.common.groupName));
    await user.click(nameInput);
    await user.type(nameInput, 'st1');
    const monthlyTokenInput = screen.getByLabelText('Monthly tokens');
    await user.click(monthlyTokenInput);
    await user.type(monthlyTokenInput, '1');
    const monthlyUserTokenInput = screen.getByLabelText('Monthly tokens / User');
    await user.click(monthlyUserTokenInput);
    await user.type(monthlyUserTokenInput, '-1');
    const saveBtn = screen.getByRole('button', { name: 'Save' });
    await user.click(saveBtn);
    expect(document.querySelectorAll('.mantine-InputWrapper-error')).toHaveLength(1);
  });

  it('should call onClose when cancel button is clicked', async () => {
    render(<CreateUserGroupDialog {...defaultProps} />);

    const user = userEvent.setup();
    const cancelButton = screen.getByRole('button', { name: texts.common.cancel });
    await user.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.onCreate).not.toHaveBeenCalled();
  });

  it('should display an error message on response 500', async () => {
    render(<CreateUserGroupDialog {...defaultProps} />);
    server.use(
      http.put(`${apiBaseUrl}/users`, () => {
        return new Response(null, { status: 500 });
      }),
    );
    const user = userEvent.setup();
    const saveButton = screen.getByRole('button', { name: texts.common.save });
    await user.click(saveButton);

    expect(document.querySelectorAll('.mantine-InputWrapper-error')).toHaveLength(1);
  });
});
