import { test } from '@playwright/test';
import { config } from '../utils/config';
import { enterAdminArea, expectA11yCompliant, login, navigateToUserGroupAdministration } from '../utils/helper';

test('admin user-groups page is accessible', async ({ page }) => {
  await login(page);
  await enterAdminArea(page);
  await navigateToUserGroupAdministration(page);
  await page.waitForURL(`${config.URL}/admin/user-groups`);
  await expectA11yCompliant(page);
});
