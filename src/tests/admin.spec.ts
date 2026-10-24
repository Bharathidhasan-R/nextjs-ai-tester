import { test, expect } from '@playwright/test';

test.describe('Twenty4 DigiGold - Admin Panel Tests', () => {
  test('Admin can access dashboard overview', async ({ page }) => {
    // twenty4_digigold admin dashboard is at /dashboard
    await page.goto('dashboard');
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Admin sidebar / navigation is accessible', async ({ page }) => {
    await page.goto('dashboard');
    // Verify dashboard header or navigation elements
    const dashboardNav = page.locator('nav, aside, header').first();
    await expect(dashboardNav).toBeVisible();
  });

  test('Admin can access orders management', async ({ page }) => {
    await page.goto('dashboard/orders');
    await expect(page).toHaveURL(/.*dashboard\/orders/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Admin can access metal rates dashboard', async ({ page }) => {
    await page.goto('dashboard/rates');
    await expect(page).toHaveURL(/.*dashboard\/rates/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Admin can access app users list', async ({ page }) => {
    await page.goto('dashboard/app-users');
    await expect(page).toHaveURL(/.*dashboard\/app-users/);
    await expect(page.locator('body')).toBeVisible();
  });
});