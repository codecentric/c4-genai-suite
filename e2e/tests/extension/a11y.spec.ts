import { test } from '@playwright/test';
import { config } from '../utils/config';
import { enterAdminArea, expectA11yCompliant, login, navigateToUserAdministration } from '../utils/helper';

test('accessibility', async ({ page }) => {
  await test.step('login page accessible', async () => {
    await page.goto(`${config.URL}/login`);
    await page.getByRole('button', { name: 'Login' }).waitFor();
    await expectA11yCompliant(page);
  });

  await test.step('main page accessible', async () => {
    await login(page);
    await expectA11yCompliant(page);
  });

  await test.step('admin users page accessible', async () => {
    await enterAdminArea(page);
    await navigateToUserAdministration(page);
    await expectA11yCompliant(page);
  });
});
