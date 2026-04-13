import { test } from '@playwright/test';
import { config } from '../utils/config';
import { enterAdminArea, expectA11yCompliant, login } from '../utils/helper';

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

  await test.step('admin audit-log page accessible', async () => {
    await enterAdminArea(page);
    await page.getByRole('link', { name: 'Audit Log' }).click();
    await page.getByRole('heading', { name: 'Audit Log' }).waitFor();
    await expectA11yCompliant(page);
  });
});
