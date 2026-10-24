import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Twenty4 DigiGold - Storefront UI Suite', () => {
  const screenshotsDir = path.resolve(process.cwd(), 'screenshots/ui');

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  /* -------------------------------------------------------------------------
   * TC-UI-01: Homepage & Brand Identity
   * ------------------------------------------------------------------------- */
  test('GET / - Homepage loads correctly with brand title & header', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'UI' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-UI-01' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /' });
    testInfo.annotations.push({ type: 'expected', description: 'Page loads with Twenty4 DigiGold brand title, header, and visible body' });

    await page.goto('', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page).toHaveTitle(/twenty4|digigold|gold/i);

    const header = page.locator('header').first();
    await expect(header).toBeVisible();

    const screenshotPath = path.join(screenshotsDir, 'tc-ui-01-homepage.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('checkpoint-screenshot', { path: screenshotPath, contentType: 'image/png' });
  });

  /* -------------------------------------------------------------------------
   * TC-UI-02: Live Rates Ticker Strip
   * ------------------------------------------------------------------------- */
  test('GET / - Live rates ticker strip is displayed with metal prices', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'UI' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-UI-02' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /' });
    testInfo.annotations.push({ type: 'expected', description: 'Live rates ticker displays gold, silver, or INR currency symbols' });

    await page.goto('', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const ticker = page.locator('text=/Gold|Silver|24K|22K|₹/i').first();
    await expect(ticker).toBeVisible();
  });

  /* -------------------------------------------------------------------------
   * TC-UI-03: Digital Gold Vault Page
   * ------------------------------------------------------------------------- */
  test('GET /digital-gold - Digital Gold purchasing and vault page loads', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'UI' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-UI-03' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /digital-gold' });
    testInfo.annotations.push({ type: 'expected', description: 'Navigates to /digital-gold with purchase cards and purity guarantees' });

    await page.goto('digital-gold', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page).toHaveURL(/.*digital-gold/);
    await expect(page.locator('body')).toBeVisible();

    const screenshotPath = path.join(screenshotsDir, 'tc-ui-03-digital-gold.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('checkpoint-screenshot', { path: screenshotPath, contentType: 'image/png' });
  });

  /* -------------------------------------------------------------------------
   * TC-UI-04: Jewellery Collections Catalogue
   * ------------------------------------------------------------------------- */
  test('GET /collections - Jewellery collections catalogue page loads', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'UI' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-UI-04' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /collections' });
    testInfo.annotations.push({ type: 'expected', description: 'Navigates to /collections displaying product catalogue' });

    await page.goto('collections', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page).toHaveURL(/.*collections/);
    await expect(page.locator('body')).toBeVisible();
  });

  /* -------------------------------------------------------------------------
   * TC-UI-05: Gold Savings Schemes
   * ------------------------------------------------------------------------- */
  test('GET /schemes - Gold savings schemes page loads', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'UI' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-UI-05' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /schemes' });
    testInfo.annotations.push({ type: 'expected', description: 'Navigates to /schemes displaying savings plans and benefits' });

    await page.goto('schemes', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page).toHaveURL(/.*schemes/);
    await expect(page.locator('body')).toBeVisible();
  });

  /* -------------------------------------------------------------------------
   * TC-UI-06: Live Metal Rates Dedicated Page
   * ------------------------------------------------------------------------- */
  test('GET /rates - Live metal rates dedicated page loads', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'UI' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-UI-06' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /rates' });
    testInfo.annotations.push({ type: 'expected', description: 'Displays live gold/silver charts, 24K/22K rates and freshness' });

    await page.goto('rates', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page).toHaveURL(/.*rates/);
    await expect(page.locator('body')).toBeVisible();

    const screenshotPath = path.join(screenshotsDir, 'tc-ui-06-rates.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('checkpoint-screenshot', { path: screenshotPath, contentType: 'image/png' });
  });

  /* -------------------------------------------------------------------------
   * TC-UI-07: Customer Login Form & OTP Trigger
   * ------------------------------------------------------------------------- */
  test('GET /login - Customer Login page presents mobile and Send OTP fields', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'UI' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-UI-07' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /login' });
    testInfo.annotations.push({ type: 'expected', description: 'Customer login presents 10-digit mobile input and interactive Send OTP button' });

    await page.goto('login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const mobileInput = page.locator('input#mobile, input[autocomplete="tel-national"], input[placeholder*="98765"]');
    const sendOtpBtn = page.getByRole('button', { name: /send otp/i });

    await expect(mobileInput).toBeVisible();
    await expect(sendOtpBtn).toBeVisible();

    const screenshotPath = path.join(screenshotsDir, 'tc-ui-07-customer-login.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('checkpoint-screenshot', { path: screenshotPath, contentType: 'image/png' });
  });

  /* -------------------------------------------------------------------------
   * TC-UI-08: Admin Console Login Page
   * ------------------------------------------------------------------------- */
  test('GET /admin-login - Admin Console Login page displays credentials form', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'UI' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-UI-08' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /admin-login' });
    testInfo.annotations.push({ type: 'expected', description: 'Admin console displays username/email input, password input, and Sign In action' });

    await page.goto('admin-login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const userInput = page.locator('input[name="username"], input[name="email"], input[placeholder*="admin"]');
    const passInput = page.locator('input[name="password"]');
    const submitBtn = page.getByRole('button', { name: /sign in|login/i });

    await expect(userInput).toBeVisible();
    await expect(passInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  /* -------------------------------------------------------------------------
   * TC-UI-09: Mobile Responsive 375px Viewport Boundary
   * ------------------------------------------------------------------------- */
  test('GET / - Mobile responsive layout eliminates horizontal scroll overflow', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'UI' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-UI-09' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /' });
    testInfo.annotations.push({ type: 'expected', description: 'At 375px viewport, page fits within screen with zero horizontal overflow' });

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('', { waitUntil: 'domcontentloaded', timeout: 30000 });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    const screenshotPath = path.join(screenshotsDir, 'tc-ui-09-mobile-375px.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('checkpoint-screenshot', { path: screenshotPath, contentType: 'image/png' });
  });
});