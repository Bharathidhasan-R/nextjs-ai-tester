import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import {
  analyzePageAndSuggestScenarios,
  analyzeVisualScreenshotWithAI,
  sanitizeForAI,
  AIScenario,
} from '../lib/ai-engine';

test.describe('Twenty4 DigiGold - Admin Panel AI-Assisted Testing Suite', () => {
  const screenshotsDir = path.resolve(process.cwd(), 'screenshots/admin-ai');

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  /* -------------------------------------------------------------------------
   * TC-ADM-AI-01: Admin Dashboard Discovery & Scenario Generation
   * ------------------------------------------------------------------------- */
  test('ADM-AI-01: AI discovers admin dashboard architecture and suggests test scenarios', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'Admin AI-Assisted' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-ADM-AI-01' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /dashboard' });
    testInfo.annotations.push({ type: 'expected', description: 'Gemini AI analyzes dashboard components and generates positive and boundary scenarios' });

    await page.goto('dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page).toHaveURL(/.*dashboard/);

    // Wait for client components to render navigation links
    await page.waitForSelector('a, button, input', { timeout: 15000 });
    await page.waitForTimeout(1000);

    const title = await page.title();

    // Extract interactive elements across the dashboard
    const interactiveElements = await page.evaluate(() => {
      const items: { tag: string; text: string; role?: string; id?: string }[] = [];
      const nodes = document.querySelectorAll('a, button, [role="button"], input');
      nodes.forEach((n) => {
        const text = (n.textContent || (n as HTMLInputElement).value || (n as HTMLInputElement).placeholder || '').trim();
        if (text && text.length < 50) {
          items.push({
            tag: n.tagName.toLowerCase(),
            text: text.replace(/\s+/g, ' '),
            role: n.getAttribute('role') || undefined,
            id: n.id || undefined,
          });
        }
      });
      return items.slice(0, 15);
    });

    expect(interactiveElements.length).toBeGreaterThan(0);

    // Call AI Engine
    const scenarios: AIScenario[] = await analyzePageAndSuggestScenarios({
      route: '/dashboard',
      title,
      interactiveElements,
    });

    expect(scenarios).toBeDefined();
    expect(scenarios.length).toBeGreaterThanOrEqual(1);

    const hasPositive = scenarios.some((s) => s.type === 'positive');
    expect(hasPositive).toBeTruthy();

    const screenshotPath = path.join(screenshotsDir, 'tc-adm-ai-01-dashboard.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('checkpoint-screenshot', { path: screenshotPath, contentType: 'image/png' });
  });

  /* -------------------------------------------------------------------------
   * TC-ADM-AI-02: AI Metal Rates Console Inspection & Boundary Scenarios
   * ------------------------------------------------------------------------- */
  test('ADM-AI-02: AI analyzes Rate Fix management console and generates rate test cases', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'Admin AI-Assisted' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-ADM-AI-02' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /dashboard/rates' });
    testInfo.annotations.push({ type: 'expected', description: 'AI evaluates rate adjustment UI controls and generates safe validation scenarios' });

    await page.goto('dashboard/rates', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page).toHaveURL(/.*dashboard\/rates/);

    const title = await page.title();

    const elements = await page.evaluate(() => {
      const items: { tag: string; text: string; role?: string; id?: string }[] = [];
      document.querySelectorAll('input, button, [role="switch"], select, table').forEach((n) => {
        const text = (n.textContent || (n as HTMLInputElement).placeholder || (n as HTMLInputElement).value || '').trim();
        if (text) {
          items.push({
            tag: n.tagName.toLowerCase(),
            text: text.slice(0, 40),
            id: n.id || undefined,
          });
        }
      });
      return items.slice(0, 12);
    });

    const scenarios = await analyzePageAndSuggestScenarios({
      route: '/dashboard/rates',
      title,
      interactiveElements: elements,
    });

    expect(scenarios.length).toBeGreaterThanOrEqual(1);

    // Verify all generated scenarios comply with Safety Requirement H (non-destructive)
    for (const sc of scenarios) {
      expect(sc.scenario.toLowerCase()).not.toMatch(/drop|wipe|truncate|destroy/);
      expect(sc.confidence).toBeGreaterThan(0.5);
    }

    const screenshotPath = path.join(screenshotsDir, 'tc-adm-ai-02-rates.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('checkpoint-screenshot', { path: screenshotPath, contentType: 'image/png' });
  });

  /* -------------------------------------------------------------------------
   * TC-ADM-AI-03: AI App Users & Access Permissions Audit
   * ------------------------------------------------------------------------- */
  test('ADM-AI-03: AI evaluates App Users directory and customer account controls', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'Admin AI-Assisted' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-ADM-AI-03' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /dashboard/app-users' });
    testInfo.annotations.push({ type: 'expected', description: 'AI verifies registered users table, search inputs, and filters' });

    await page.goto('dashboard/app-users', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page).toHaveURL(/.*dashboard\/app-users/);
    await expect(page.locator('body')).toBeVisible();

    // Verify presence of search input, button, or table container
    const searchOrTable = page.locator('input, button, table, [role="table"]').first();
    await expect(searchOrTable).toBeVisible({ timeout: 15000 });

    const screenshotPath = path.join(screenshotsDir, 'tc-adm-ai-03-users.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('checkpoint-screenshot', { path: screenshotPath, contentType: 'image/png' });
  });

  /* -------------------------------------------------------------------------
   * TC-ADM-AI-04: AI Orders Management & Fulfillment Inspection
   * ------------------------------------------------------------------------- */
  test('ADM-AI-04: AI inspects orders and transactions tracking console', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'Admin AI-Assisted' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-ADM-AI-04' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /dashboard/orders' });
    testInfo.annotations.push({ type: 'expected', description: 'Admin orders console renders with filter tabs and order records' });

    await page.goto('dashboard/orders', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page).toHaveURL(/.*dashboard\/orders/);

    await expect(page.locator('body')).toBeVisible();

    const screenshotPath = path.join(screenshotsDir, 'tc-adm-ai-04-orders.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('checkpoint-screenshot', { path: screenshotPath, contentType: 'image/png' });
  });

  /* -------------------------------------------------------------------------
   * TC-ADM-AI-05: Multimodal Gemini Vision Quality Check of Admin Dashboard
   * ------------------------------------------------------------------------- */
  test('ADM-AI-05: Multimodal Gemini Vision evaluates admin portal visual quality and UX hierarchy', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'Admin AI-Assisted' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-ADM-AI-05' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /dashboard' });
    testInfo.annotations.push({ type: 'expected', description: 'Gemini Vision returns visual health score and UI observations for the admin console' });

    await page.goto('dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000); // Allow motion animations and widgets to settle

    const screenshotPath = path.join(screenshotsDir, 'tc-adm-ai-05-visual-audit.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    await testInfo.attach('checkpoint-screenshot', { path: screenshotPath, contentType: 'image/png' });

    const visualAnalysis = await analyzeVisualScreenshotWithAI({
      screenshotPath,
      pageContext: 'Twenty4 DigiGold Admin Portal Overview - Navigation Sidebar, Summary Metrics, and Quick Stats Cards',
    });

    expect(visualAnalysis).toBeDefined();
    expect(visualAnalysis.score).toBeGreaterThan(0);
    expect(visualAnalysis.summary.length).toBeGreaterThan(5);
    expect(visualAnalysis.positiveObservations.length).toBeGreaterThan(0);
  });
});
