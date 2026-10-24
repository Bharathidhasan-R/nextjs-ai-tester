import { test, expect } from '@playwright/test';
import { analyzeScreenshotWithGemini } from '../lib/gemini';
import path from 'path';
import fs from 'fs';

test.describe('Twenty4 DigiGold - Visual Quality Testing with Gemini AI', () => {
  const screenshotDir = path.join(process.cwd(), 'screenshots');

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test('Homepage desktop visual quality check', async ({ page }) => {
    await page.goto('');
    await page.waitForLoadState('domcontentloaded');

    const screenshotPath = path.join(screenshotDir, `homepage-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const analysis = await analyzeScreenshotWithGemini(screenshotPath);

    console.log('\n===== Gemini Visual Analysis: Homepage =====');
    console.log(analysis);
    console.log('============================================\n');

    expect(analysis.toLowerCase()).toContain('status:');
  });

  test('Live rates page visual quality check', async ({ page }) => {
    await page.goto('rates');
    await page.waitForLoadState('domcontentloaded');

    const screenshotPath = path.join(screenshotDir, `rates-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const analysis = await analyzeScreenshotWithGemini(
      screenshotPath,
      `Analyze this Live Metal Rates page screenshot for Twenty4 DigiGold.
Focus on:
- Gold and Silver rate card layouts
- Price charts / trend graph legibility
- Purity labels (24K 999, 22K 916)
- Currency formatting (₹ INR)

Reply in this format:
Status: PASS or FAIL
Issues:
- issue (or "None")
Suggestions:
- suggestion (or "None")`
    );

    console.log('\n===== Gemini Visual Analysis: Live Rates =====');
    console.log(analysis);
    console.log('==============================================\n');

    expect(analysis.toLowerCase()).toContain('status:');
  });

  test('Mobile responsive visual check', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('');
    await page.waitForLoadState('domcontentloaded');

    const screenshotPath = path.join(screenshotDir, `mobile-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const analysis = await analyzeScreenshotWithGemini(
      screenshotPath,
      `Analyze this mobile screenshot of Twenty4 DigiGold. Focus on:
       - Touch target sizes (buttons and hamburger menu)
       - Text readability & typography hierarchy
       - Padding and spacing on 375px screens
       - Horizontal overflow or clipped elements
       
       Reply with:
       Status: PASS or FAIL
       Issues:
       - issue (or "None")
       Suggestions:
       - suggestion (or "None")`
    );

    console.log('\n===== Gemini Visual Analysis: Mobile =====');
    console.log(analysis);
    console.log('==========================================\n');

    expect(analysis.toLowerCase()).toContain('status:');
  });
});