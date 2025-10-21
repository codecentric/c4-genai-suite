import { test } from '@playwright/test';
import { config } from '../tests/utils/config';
import { expectAccessibility, login } from '../tests/utils/helper';

test('accessibility', async ({ page }) => {
  await test.step('login page accessible', async () => {
    await page.goto(`${config.URL}/login`);
    await expectAccessibility(page);
  });

  await test.step('main page accessible', async () => {
    await login(page);
    await expectAccessibility(page);
  });
});
