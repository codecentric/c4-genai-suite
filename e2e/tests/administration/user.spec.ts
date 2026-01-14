import { faker } from '@faker-js/faker';
import { expect, test } from '@playwright/test';
import { createUserIfNotExists, enterAdminArea, login, navigateToUserAdministration } from '../utils/helper';

test.describe('User management', () => {
  const randomName = faker.person.fullName();
  const randomEmail = faker.internet.email();
  const randomNewName = faker.person.fullName();
  const randomNewEmail = faker.internet.email();

  test.beforeEach(async ({ page }) => {
    await login(page);
    await enterAdminArea(page);
  });

  test('should create a user', async ({ page }) => {
    await navigateToUserAdministration(page);
    await createUserIfNotExists(page, { email: randomEmail, name: randomName });
  });

  test('should edit the user details', async ({ page }) => {
    await navigateToUserAdministration(page);

    await page.locator('tr:nth-child(2) > td').first().click();
    await page.getByLabel('Name').click();
    await page.getByLabel('Name').fill(randomNewName);
    await page.getByLabel('Email').click();
    await page.getByLabel('Email').fill(randomNewEmail);
    await page.getByRole('button', { name: 'Save' }).click();

    const userName = await page.getByRole('cell', { name: randomNewName }).textContent();
    const userEmail = await page.getByRole('cell', { name: randomNewEmail }).textContent();

    expect(userName).toEqual(randomNewName);
    expect(userEmail).toEqual(randomNewEmail);
  });

  test('should delete a user', async ({ page }) => {
    await navigateToUserAdministration(page);

    const adminCell = page.getByRole('cell', { name: 'Admin', exact: true });
    await adminCell.last().waitFor();

    const userToBeDeleted = await page.getByRole('table').getByRole('row').last().textContent();
    expect(userToBeDeleted).toBeDefined();

    await page.getByRole('table').getByRole('row').last().click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();

    const updateUserModal = page.getByRole('heading', { name: 'Update User' });
    await updateUserModal.waitFor({ state: 'detached' });

    const editedRows = page.getByRole('table').getByRole('row').filter({ hasText: userToBeDeleted! });
    await expect(editedRows).toHaveCount(0);
  });

  test('should set user group to default when creating a new user', async ({ page }) => {
    await navigateToUserAdministration(page);

    await page.getByRole('button', { name: 'Create User' }).click();

    const groupIdsValue = await page.locator('#userGroupIds').inputValue();

    expect(groupIdsValue).toEqual('default');
  });

  test('should alert when username and email is empty', async ({ page }) => {
    await navigateToUserAdministration(page);

    await page.getByRole('button', { name: 'Create User' }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    expect(page.getByRole('alert', { name: 'Name is a required field' })).toBeDefined();
    expect(page.getByRole('alert', { name: 'Email is a required field' })).toBeDefined();
  });

  test('should alert when password and confirm password do not match', async ({ page }) => {
    await navigateToUserAdministration(page);

    await page.getByRole('button', { name: 'Create User' }).click();
    await page.getByLabel('Password', { exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill('abc');
    await page.getByLabel('Confirm Password').click();
    await page.getByLabel('Confirm Password').fill('abd');
    await page.getByRole('button', { name: 'Save' }).click();

    expect(page.getByRole('alert', { name: 'Passwords do not match.' })).toBeDefined();
  });
});
