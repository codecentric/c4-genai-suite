import { test } from '@playwright/test';
import { enterAdminArea, expectA11yCompliant, login, navigateToUserGroupAdministration } from '../utils/helper';

test('accessibility', async ({ page }) => {
  await login(page);
  await enterAdminArea(page);

  await test.step('user groups page accessible', async () => {
    await navigateToUserGroupAdministration(page);
    await expectA11yCompliant(page);
  });
});
