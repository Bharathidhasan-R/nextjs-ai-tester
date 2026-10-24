import { test, expect } from '@playwright/test';

test.describe('Twenty4 DigiGold - Customer Account Tests', () => {
  test('Customer can access account overview', async ({ page }) => {
    await page.goto('account');
    await expect(page).toHaveURL(/.*account/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Customer can see orders page', async ({ page }) => {
    await page.goto('account/orders');
    await expect(page).toHaveURL(/.*account\/orders/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Customer can see transactions history', async ({ page }) => {
    await page.goto('account/transactions');
    await expect(page).toHaveURL(/.*account\/transactions/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Customer can access SIPs (Systematic Investment Plans)', async ({ page }) => {
    await page.goto('account/sips');
    await expect(page).toHaveURL(/.*account\/sips/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Customer can access profile page', async ({ page }) => {
    await page.goto('account/profile');
    await expect(page).toHaveURL(/.*account\/profile/);
    await expect(page.locator('body')).toBeVisible();
  });
});