import test, { expect } from '@playwright/test';
import { changePassword, createUserIfNotExists, enterAdminArea, login, logout } from '../utils/helper';

test('User settings', async ({ page }) => {
  await test.step('admin user should login', async () => {
    await login(page);
  });

  await test.step('admin user should create a new user', async () => {
    await enterAdminArea(page);
    await createUserIfNotExists(page, {
      name: 'test-user',
      email: 'test-user@example.com',
      password: 'test-secret',
    });
    await logout(page);
  });
  await test.step('new user should login', async () => {
    await login(page, { email: 'test-user@example.com', password: 'test-secret' });
  });
  await test.step('new user should fail to change the password', async () => {
    await page.getByTestId('menu user').waitFor();
    await page.getByTestId('menu user').click();
    await page.getByRole('menuitem', { name: 'Settings' }).waitFor();
    await page.getByRole('menuitem', { name: 'Settings' }).click();
    await page.getByRole('tab', { name: 'Security' }).waitFor();
    await page.getByRole('tab', { name: 'Security' }).click();
    await changePassword(page, '123', 'new-secret');
    await expect(page.getByText('Failed to update password')).toBeVisible({ timeout: 1000 });
    await page.getByRole('button', { name: 'close' }).first().click();
  });
  await test.step('new user should change the password', async () => {
    await changePassword(page, 'test-secret', 'new-secret');
    await expect(page.getByText('Password updated successfully')).toBeVisible({ timeout: 1000 });
    await page.getByRole('button', { name: 'close' }).last().click();
    await page.getByRole('banner').getByRole('button').click();
  });
  await test.step('new user should logout and login with the new password', async () => {
    await page.getByTestId('menu user').waitFor();
    await page.getByTestId('menu user').click();
    await page.getByRole('menuitem', { name: 'Logout' }).waitFor();
    await page.getByRole('menuitem', { name: 'Logout' }).click();
    await login(page, { email: 'test-user@example.com', password: 'new-secret' });
  });
});
