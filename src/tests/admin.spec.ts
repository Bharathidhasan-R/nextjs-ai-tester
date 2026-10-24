import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Twenty4 DigiGold - Admin Panel Tests', () => {
  const screenshotsDir = path.resolve(process.cwd(), 'screenshots/admin');

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test('Admin can access dashboard overview', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'Admin Console' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-ADM-01' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /dashboard' });
    testInfo.annotations.push({ type: 'expected', description: 'Authenticated admin can view the dashboard console and metrics' });

    await page.goto('dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('body')).toBeVisible();

    // Verify admin branding or header
    const title = await page.title();
    expect(title).toContain('Admin');

    const screenshotPath = path.join(screenshotsDir, 'tc-adm-01-dashboard.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('screenshot', { path: screenshotPath, contentType: 'image/png' });
  });

  test('Admin sidebar / navigation is accessible', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'Admin Console' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-ADM-02' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /dashboard' });
    testInfo.annotations.push({ type: 'expected', description: 'Navigation menu with App Users, Rates, or Transactions is visible' });

    await page.goto('dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for client components to hydrate sidebar links
    const sidebarLink = page.locator('a[href*="dashboard"], a[href*="rates"], a[href*="app-users"]').first();
    await expect(sidebarLink).toBeVisible({ timeout: 15000 });

    const navText = await page.locator('body').innerText();
    expect(navText).toMatch(/Dashboard|Twenty4 DigiGold/i);
  });

  test('Admin can access orders management', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'Admin Console' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-ADM-03' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /dashboard/orders' });
    testInfo.annotations.push({ type: 'expected', description: 'Admin can navigate to orders/transactions management page' });

    await page.goto('dashboard/orders', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page).toHaveURL(/.*dashboard\/orders/);
    await expect(page.locator('body')).toBeVisible();

    const screenshotPath = path.join(screenshotsDir, 'tc-adm-03-orders.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('screenshot', { path: screenshotPath, contentType: 'image/png' });
  });

  test('Admin can access metal rates dashboard', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'Admin Console' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-ADM-04' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /dashboard/rates' });
    testInfo.annotations.push({ type: 'expected', description: 'Admin can view and manage gold and silver rates' });

    await page.goto('dashboard/rates', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page).toHaveURL(/.*dashboard\/rates/);
    await expect(page.locator('body')).toBeVisible();

    const screenshotPath = path.join(screenshotsDir, 'tc-adm-04-rates.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('screenshot', { path: screenshotPath, contentType: 'image/png' });
  });

  test('Admin can access app users list', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'Admin Console' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-ADM-05' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /dashboard/app-users' });
    testInfo.annotations.push({ type: 'expected', description: 'Admin can view registered app users table' });

    await page.goto('dashboard/app-users', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page).toHaveURL(/.*dashboard\/app-users/);
    await expect(page.locator('body')).toBeVisible();

    const screenshotPath = path.join(screenshotsDir, 'tc-adm-05-app-users.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('screenshot', { path: screenshotPath, contentType: 'image/png' });
  });
});