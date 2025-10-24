import { test } from '@playwright/test';
import { config } from '../tests/utils/config';
import { expectA11yCompliant, login } from '../tests/utils/helper';

test('accessibility', async ({ page }) => {
  await test.step('login page accessible', async () => {
    await page.goto(`${config.URL}/login`);
    await expectA11yCompliant(page);
  });

  await test.step('main page accessible', async () => {
    await login(page);
    await expectA11yCompliant(page);
  });
});
