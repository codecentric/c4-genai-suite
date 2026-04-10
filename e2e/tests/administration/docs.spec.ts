import { expect, test } from '@playwright/test';
import { enterAdminArea, login } from '../utils/helper';

test('Documentation on Admin page', async ({ page }) => {
  await test.step('should login', async () => {
    await login(page);
  });

  await test.step('should not show documentation on chat page', async () => {
    await page.waitForTimeout(2000); // such that docs have some time to load
    await expect(page.getByTestId('docs-icon')).toBeHidden();
  });

  await test.step('should show documentation on button click in admin area', async () => {
    await enterAdminArea(page);
    await page.getByTestId('docs-icon').click();
    await page.getByRole('heading', { name: 'Documentation' }).click();
    await page.getByRole('heading', { name: 'The Admin Dashboard' }).click();
    await page.getByText('The "Dashboard" page offers a').click();
  });

  await test.step('should navigate to different app route and docs via docs link', async () => {
    await page.locator('ol').getByRole('link', { name: 'Assistants' }).click();
    await page.getByRole('heading', { name: 'Do I need one or many' }).click();
  });

  await test.step('should have a working close button', async () => {
    await page.getByTestId('close-icon').click();
    await page.getByTestId('docs-icon').click();
  });

  await test.step('should have documentation for Groups', async () => {
    await page.getByRole('link', { name: 'Groups', exact: true }).click();
    await page.getByRole('heading', { name: 'The Groups Page' }).click();
  });

  await test.step('should have documentation for Users', async () => {
    await page.getByRole('link', { name: 'Users', exact: true }).click();
    await page.getByRole('heading', { name: 'The Users Page' }).click();
  });

  await test.step('should have documentation for Files', async () => {
    await page.getByRole('link', { name: 'Files', exact: true }).click();
    await page.getByRole('heading', { name: 'List of File-Management-Tools' }).click();
  });

  await test.step('should have documentation for Theme', async () => {
    await page.getByRole('link', { name: 'Theme', exact: true }).click();
    await page.getByRole('cell', { name: 'Custom links that are' }).click();
  });

  await test.step('should have documentation for Dashboard', async () => {
    await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
    await page.getByRole('heading', { name: 'How To Get Started with C4' }).click();
  });

  await test.step('should have documentation for Assistants', async () => {
    await page.getByTestId('sidebar-admin').getByRole('link', { name: 'Assistants', exact: true }).click();
    await page.getByRole('heading', { name: 'The Assistants Page' }).click();
    await page.getByRole('heading', { name: 'Custom Extensions' }).click();
  });

  await test.step('should still show documentation when an Assistant is selected', async () => {
    // create Fake Assistant for test
    await page.getByRole('button', { name: 'Create assistant' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Fake Assistant');
    await page.getByRole('textbox', { name: 'Description' }).fill('Test');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('link', { name: 'Fake Assistant' }).click();
    await page.getByRole('heading', { name: 'The Assistants Page' }).click();
  });

  await test.step('should not show documentation on login page', async () => {
    await page.getByTestId('menu user').click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();
    await expect(page.getByTestId('docs-icon')).toBeHidden();
    await expect(page.getByTestId('close-icon')).toBeHidden();
  });
});
