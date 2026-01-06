import { faker } from '@faker-js/faker';
import { expect, test } from '@playwright/test';
import {
  createUserIfNotExists,
  enterAdminArea,
  enterUserArea,
  hasMenuItem,
  login,
  logout,
  navigateToUserAdministration,
} from '../utils/helper';

test.describe('User permissions', () => {
  const randomName = faker.person.fullName();
  const randomEmail = faker.internet.email();
  const randomPassword = faker.internet.password({ length: 12 });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await enterAdminArea(page);
  });

  test('admin user should see admin item in chat section', async ({ page }) => {
    await enterUserArea(page);
    expect(await hasMenuItem(page, { name: 'Admin' })).toBe(true);
  });

  test('admin user should not see admin item in admin section', async ({ page }) => {
    expect(await hasMenuItem(page, { name: 'Admin' })).toBe(false);
  });

  test('newly created user with group default should not see admin section', async ({ page }) => {
    await navigateToUserAdministration(page);
    await createUserIfNotExists(page, { email: randomEmail, name: randomName, password: randomPassword });
    await logout(page);
    await login(page, { email: randomEmail, password: randomPassword });
    expect(await hasMenuItem(page, { name: 'Admin' })).toBe(false);
  });
});
