import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { UserGroupDto } from 'src/api';
import { texts } from 'src/texts';
import { render, required } from '../test-utils';
import { CreateUserDialog } from './UpsertUserDialog';

describe('User Page', () => {
  const mockUserGroups: UserGroupDto[] = [
    {
      id: 'admin',
      isAdmin: true,
      isBuiltIn: true,
      monthlyTokens: 0,
      monthlyUserTokens: 0,
      name: 'Admin',
    },
    {
      id: 'default',
      isAdmin: false,
      isBuiltIn: true,
      monthlyTokens: 0,
      monthlyUserTokens: 0,
      name: 'Default',
    },
    {
      id: 'group',
      isAdmin: false,
      isBuiltIn: false,
      monthlyTokens: 0,
      monthlyUserTokens: 0,
      name: 'Group',
    },
  ];

  it('should disable API key generation button when the user group admin is not selected ', async () => {
    render(<CreateUserDialog userGroups={mockUserGroups} onCreate={() => {}} onClose={() => {}} />);

    const user = userEvent.setup();

    // Because the Default user group is already selected, we do not have to add it.
    // Use the base label without asterisk for role-based queries since the asterisk is aria-hidden
    const userGroups = screen.getByRole('textbox', { name: texts.common.userGroups });
    await user.click(userGroups);
    const adminOption = screen.getByRole('option', { name: /Admin/i });
    await user.click(adminOption); // add
    await user.click(adminOption); // remove again

    const generateButton = screen.getByRole('button', { name: texts.users.generateAPIKey });
    expect(generateButton).toBeDisabled();
  });

  it('should generate a random API Key if user group admin is selected', async () => {
    render(<CreateUserDialog userGroups={mockUserGroups} onCreate={() => {}} onClose={() => {}} />);

    const user = userEvent.setup();

    const userGroup = screen.getByRole('textbox', { name: texts.common.userGroups });
    await user.click(userGroup);
    const adminOption = screen.getByRole('option', { name: /Admin/i });
    await user.click(adminOption);

    const generateButton = screen.getByRole('button', { name: texts.users.generateAPIKey });
    await user.click(generateButton);
    const apiKeyInput = screen.getByRole('textbox', { name: texts.common.apiKey });
    await waitFor(() => expect(apiKeyInput).toHaveValue());
  });

  it('should select the user group default on initial state', () => {
    render(<CreateUserDialog userGroups={mockUserGroups} onCreate={() => {}} onClose={() => {}} />);

    expect(document.querySelector('.mantine-Pill-label')).toHaveTextContent('Default');
  });

  it('should select multiple user groups', async () => {
    render(<CreateUserDialog userGroups={mockUserGroups} onCreate={() => {}} onClose={() => {}} />);

    const user = userEvent.setup();

    const userGroup = screen.getByRole('textbox', { name: texts.common.userGroups });
    await user.click(userGroup);
    const groupOption = screen.getByRole('option', { name: /Group/i });
    await user.click(groupOption);

    const pills = document.querySelectorAll('.mantine-Pill-label');
    const pillTexts = Array.from(pills).map((p) => p.textContent);
    expect(pillTexts).toContain('Default');
    expect(pillTexts).toContain('Group');
  });

  it('should alert when username and email are empty', async () => {
    render(<CreateUserDialog userGroups={mockUserGroups} onCreate={() => {}} onClose={() => {}} />);

    const user = userEvent.setup();
    const saveBtn = screen.getAllByRole('button', { name: 'Save' });
    await user.click(saveBtn[0]);
    expect(document.querySelectorAll('.mantine-InputWrapper-error')).toHaveLength(2);
  });

  it('should alert when password and confirm password do not match', async () => {
    render(<CreateUserDialog userGroups={mockUserGroups} onCreate={() => {}} onClose={() => {}} />);

    const user = userEvent.setup();
    const username = screen.getByLabelText(required('Name'));
    await user.type(username, 'st1');
    const email = screen.getByLabelText(required(texts.common.email));
    await user.type(email, 'st1@st1.com');
    const pwd = screen.getByLabelText('Password');
    await user.type(pwd, 'abc');
    const confirmPwd = screen.getByLabelText('Confirm Password');
    await user.type(confirmPwd, 'abd');
    const saveBtn = screen.getAllByRole('button', { name: 'Save' });
    await user.click(saveBtn[0]);
    expect(document.querySelectorAll('.mantine-InputWrapper-error')).toHaveLength(1);
  });
});
