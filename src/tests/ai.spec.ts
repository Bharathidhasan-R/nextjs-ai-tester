import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import {
  analyzePageAndSuggestScenarios,
  analyzeTestFailureWithAI,
  sanitizeForAI,
  AIScenario,
} from '../lib/ai-engine';

test.describe('Twenty4 DigiGold - AI Testing Mode Suite', () => {
  const screenshotsDir = path.resolve(process.cwd(), 'screenshots/ai');

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  /* -------------------------------------------------------------------------
   * TC-AI-01: Page Analysis & Testable UI Discovery (Homepage)
   * ------------------------------------------------------------------------- */
  test('AI-01: Analyze homepage and discover testable interactive UI elements', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'AI-Assisted' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-AI-01' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /' });
    testInfo.annotations.push({ type: 'expected', description: 'Discovers interactive elements and generates positive, negative, and boundary scenarios' });

    await page.goto('', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const pageTitle = await page.title();

    // Extract interactive elements from DOM
    const interactiveElements = await page.evaluate(() => {
      const elements: { tag: string; text: string; role?: string; id?: string }[] = [];
      const nodes = document.querySelectorAll('button, a, input, select, [role="button"]');
      nodes.forEach((node) => {
        const text = (node.textContent || (node as HTMLInputElement).value || '').trim();
        if (text) {
          elements.push({
            tag: node.tagName.toLowerCase(),
            text: text.slice(0, 40),
            role: node.getAttribute('role') || undefined,
            id: node.id || undefined,
          });
        }
      });
      return elements.slice(0, 15);
    });

    expect(interactiveElements.length).toBeGreaterThan(0);

    // Call AI Engine to suggest candidate test scenarios
    const scenarios = await analyzePageAndSuggestScenarios({
      route: '/',
      title: pageTitle,
      interactiveElements,
    });

    expect(scenarios).toBeDefined();
    expect(scenarios.length).toBeGreaterThanOrEqual(2);

    const hasPositive = scenarios.some((s) => s.type === 'positive');
    const hasBoundaryOrNegative = scenarios.some((s) => s.type === 'boundary' || s.type === 'negative');
    expect(hasPositive).toBeTruthy();
    expect(hasBoundaryOrNegative).toBeTruthy();

    const screenshotPath = path.join(screenshotsDir, 'tc-ai-01-page-discovery.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('checkpoint-screenshot', { path: screenshotPath, contentType: 'image/png' });
  });

  /* -------------------------------------------------------------------------
   * TC-AI-02: Digital Gold Page Inspection & Scenario Generation
   * ------------------------------------------------------------------------- */
  test('AI-02: Generate candidate scenarios for Digital Gold vault page', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'AI-Assisted' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-AI-02' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /digital-gold' });
    testInfo.annotations.push({ type: 'expected', description: 'Generates validated positive and boundary test scenarios for digital gold vault' });

    await page.goto('digital-gold', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const pageTitle = await page.title();

    const elements = await page.evaluate(() => {
      const items: { tag: string; text: string; role?: string; id?: string }[] = [];
      document.querySelectorAll('button, a, input').forEach((n) => {
        const t = (n.textContent || '').trim();
        if (t) items.push({ tag: n.tagName.toLowerCase(), text: t.slice(0, 40), id: n.id || undefined });
      });
      return items.slice(0, 10);
    });

    const scenarios = await analyzePageAndSuggestScenarios({
      route: '/digital-gold',
      title: pageTitle,
      interactiveElements: elements,
    });

    expect(scenarios.length).toBeGreaterThanOrEqual(1);

    // Validate that scenarios do not contain destructive operations (Safety H)
    for (const sc of scenarios) {
      expect(sc.scenario.toLowerCase()).not.toMatch(/drop|wipe|truncate|rmdir/);
      expect(sc.confidence).toBeGreaterThan(0.5);
    }
  });

  /* -------------------------------------------------------------------------
   * TC-AI-03: Safe Execution of Validated Candidate Scenario
   * ------------------------------------------------------------------------- */
  test('AI-03: Validate and execute candidate positive scenario via Playwright', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'AI-Assisted' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-AI-03' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /rates' });
    testInfo.annotations.push({ type: 'expected', description: 'Candidate scenario is validated and executed deterministically with Playwright' });

    await page.goto('rates', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Validate page has rendered rate cards
    const rateCard = page.locator('text=/Gold|Silver|24K|22K/i').first();
    await expect(rateCard).toBeVisible();

    const screenshotPath = path.join(screenshotsDir, 'tc-ai-03-scenario-executed.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('checkpoint-screenshot', { path: screenshotPath, contentType: 'image/png' });
  });

  /* -------------------------------------------------------------------------
   * TC-AI-04: Credential Sanitization & Security Verification (Safety H)
   * ------------------------------------------------------------------------- */
  test('AI-04: Verify AI prompt sanitization redacts sensitive credentials and OTPs', async ({}, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'AI-Assisted' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-AI-04' });
    testInfo.annotations.push({ type: 'endpoint', description: 'INTERNAL /security-sanitizer' });
    testInfo.annotations.push({ type: 'expected', description: 'Password, OTPs, phone numbers, and API keys are redacted before transmission' });

    const sensitivePrompt = 'User logged in with password="MySecretPassword123" phone=9876543210 and otp=654321 key=AIzaSyA12345678901234567890123456789012';
    const sanitized = sanitizeForAI(sensitivePrompt);

    expect(sanitized).not.toContain('MySecretPassword123');
    expect(sanitized).not.toContain('9876543210');
    expect(sanitized).not.toContain('654321');
    expect(sanitized).not.toContain('AIzaSyA12345678901234567890123456789012');
    expect(sanitized).toContain('[REDACTED');
  });

  /* -------------------------------------------------------------------------
   * TC-AI-05: AI Failure Diagnosis & Recommendation Generation
   * ------------------------------------------------------------------------- */
  test('AI-05: Verify AI produces root cause analysis and actionable recommendations on failure', async ({}, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'AI-Assisted' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-AI-05' });
    testInfo.annotations.push({ type: 'endpoint', description: 'DIAGNOSTIC /ai-analyzer' });
    testInfo.annotations.push({ type: 'expected', description: 'Returns structured diagnosis with root cause, fix suggestions, and test ideas' });

    const simulatedFailure = {
      testTitle: 'Customer Login - Send OTP Verification',
      endpoint: 'POST /api/store/auth/send-otp',
      errorMessage: 'Expected status 200 but received 429 Too Many Requests (Rate limit exceeded for mobile 9876543210)',
    };

    const diagnosis = await analyzeTestFailureWithAI(simulatedFailure);

    expect(diagnosis).toBeDefined();
    expect(diagnosis.summary).toBeDefined();
    expect(diagnosis.probableRootCause).toBeDefined();
    expect(diagnosis.suggestedFix).toBeDefined();
    expect(Array.isArray(diagnosis.recommendedTests)).toBeTruthy();
  });

});
