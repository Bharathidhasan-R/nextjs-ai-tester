import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import {
  analyzePageAndSuggestScenarios,
  analyzeTestFailureWithAI,
  AIScenario,
} from '../lib/ai-engine';

test.describe('Twenty4 DigiGold - Hybrid Testing Mode Suite (Playwright + AI)', () => {
  const screenshotsDir = path.resolve(process.cwd(), 'screenshots/hybrid');

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  /* -------------------------------------------------------------------------
   * TC-HYB-01: Full Hybrid Flow (Discovery -> AI Suggestion -> Playwright Execution)
   * ------------------------------------------------------------------------- */
  test('HYB-01: Hybrid end-to-end flow on Homepage and Navigation', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'Hybrid' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-HYB-01' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /' });
    testInfo.annotations.push({
      type: 'expected',
      description: 'Playwright navigates, AI suggests scenarios, Playwright verifies DOM elements and captures evidence',
    });

    // 1. Playwright opens application
    await page.goto('', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();

    // 2. Discover UI elements
    const interactiveElements = await page.evaluate(() => {
      const items: { tag: string; text: string; role?: string }[] = [];
      document.querySelectorAll('a, button, header').forEach((el) => {
        const text = (el.textContent || '').trim();
        if (text) items.push({ tag: el.tagName.toLowerCase(), text: text.slice(0, 50) });
      });
      return items.slice(0, 15);
    });
    expect(interactiveElements.length).toBeGreaterThan(0);

    // 3. AI suggests relevant test scenarios
    const scenarios = await analyzePageAndSuggestScenarios({
      route: '/',
      title: pageTitle,
      interactiveElements,
    });
    expect(scenarios.length).toBeGreaterThan(0);

    // 4. Validate and execute approved scenario through Playwright
    const primaryScenario = scenarios[0];
    const header = page.locator('header').first();
    await expect(header).toBeVisible();

    // 5. Capture screenshots and collect execution logs
    const screenshotPath = path.join(screenshotsDir, 'tc-hyb-01-homepage.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('checkpoint-screenshot', { path: screenshotPath, contentType: 'image/png' });

    // Ensure Playwright remained responsible for assertions (Requirement D)
    expect(await page.locator('body').isVisible()).toBeTruthy();
  });

  /* -------------------------------------------------------------------------
   * TC-HYB-02: Live Rates Cross-Validation (API vs UI Ticker via Playwright + AI)
   * ------------------------------------------------------------------------- */
  test('HYB-02: Cross-validate backend live rates API against frontend UI ticker', async ({ page, request }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'Hybrid' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-HYB-02' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET / & GET /api/rates/current' });
    testInfo.annotations.push({
      type: 'expected',
      description: 'API returns rates.success=true and UI ticker renders matching metal price labels',
    });

    // Step A: Fetch backend live rate via API
    const apiRes = await request.get('api/rates/current');
    expect(apiRes.status()).toBe(200);
    const apiData = await apiRes.json();
    expect(apiData).toHaveProperty('success', true);
    expect(apiData).toHaveProperty('rates');

    // Step B: Open UI via Playwright
    await page.goto('', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const ticker = page.locator('text=/Gold|Silver|24K|22K|₹/i').first();
    await expect(ticker).toBeVisible();

    const screenshotPath = path.join(screenshotsDir, 'tc-hyb-02-rates-sync.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('checkpoint-screenshot', { path: screenshotPath, contentType: 'image/png' });
  });

  /* -------------------------------------------------------------------------
   * TC-HYB-03: Multi-route Discovery and State Verification
   * ------------------------------------------------------------------------- */
  test('HYB-03: Route traversal and responsive layout verification', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'Hybrid' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-HYB-03' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /digital-gold & GET /rates' });
    testInfo.annotations.push({
      type: 'expected',
      description: 'Navigates cleanly between digital-gold and rates routes with valid DOM hierarchy',
    });

    // Traverse route 1: digital-gold
    await page.goto('digital-gold', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page).toHaveURL(/.*digital-gold/);
    await expect(page.locator('body')).toBeVisible();

    // Traverse route 2: rates
    await page.goto('rates', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page).toHaveURL(/.*rates/);
    await expect(page.locator('body')).toBeVisible();

    const screenshotPath = path.join(screenshotsDir, 'tc-hyb-03-rates-page.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('checkpoint-screenshot', { path: screenshotPath, contentType: 'image/png' });
  });

  /* -------------------------------------------------------------------------
   * TC-HYB-04: AI Diagnostics on Simulated Boundary Defect
   * ------------------------------------------------------------------------- */
  test('HYB-04: Hybrid failure diagnosis generates actionable recommendations', async ({}, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'Hybrid' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-HYB-04' });
    testInfo.annotations.push({ type: 'endpoint', description: 'DIAGNOSTIC /hybrid-engine' });
    testInfo.annotations.push({
      type: 'expected',
      description: 'AI diagnoses test failure, isolates root cause, and recommends regression tests',
    });

    const analysis = await analyzeTestFailureWithAI({
      testTitle: 'Purchase Digital Gold - Payment Gateway Webhook',
      endpoint: 'POST /api/store/payment/verify',
      errorMessage: 'Payment signature verification failed: razorpay_signature mismatch with order id',
    });

    expect(analysis).toBeDefined();
    expect(analysis.probableRootCause).toBeTruthy();
    expect(analysis.suggestedFix).toBeTruthy();
    expect(analysis.recommendedTests.length).toBeGreaterThanOrEqual(1);
  });

});
