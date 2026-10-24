import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

function normalizeUrl(base: string, subpath: string): string {
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const cleanSub = subpath.startsWith('/') ? subpath.slice(1) : subpath;
  return `${cleanBase}/${cleanSub}`;
}

async function globalSetup(config: FullConfig) {
  const authDir = path.join(process.cwd(), 'playwright/.auth');
  
  // Create auth folder if it doesn't exist
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const adminAuthFile = path.join(authDir, 'admin.json');
  const customerAuthFile = path.join(authDir, 'customer.json');
  const emptyAuth = JSON.stringify({ cookies: [], origins: [] }, null, 2);

  // If running tests that don't need auth (ui, api, visual) or SKIP_AUTH_SETUP is set, skip login
  const isNonAuthRun =
    process.env.SKIP_AUTH_SETUP === 'true' ||
    process.argv.some((arg) =>
      arg.includes('--project=ui') ||
      arg.includes('--project=visual') ||
      arg.includes('--project=api') ||
      arg.includes('--project=ai') ||
      arg.includes('--project=hybrid') ||
      arg.includes('--project=playwright') ||
      arg.includes('ui.spec') ||
      arg.includes('visual.spec') ||
      arg.includes('api.spec') ||
      arg.includes('ai.spec') ||
      arg.includes('hybrid.spec')
    );

  if (isNonAuthRun) {
    console.log('\n[Global Setup] Skipping auth setup (public UI, API, or Visual suite requested).');
    if (!fs.existsSync(adminAuthFile)) fs.writeFileSync(adminAuthFile, emptyAuth);
    if (!fs.existsSync(customerAuthFile)) fs.writeFileSync(customerAuthFile, emptyAuth);
    return;
  }

  const baseURL = process.env.PRODUCTION_URL || 'http://localhost:3000/digigold';
  console.log(`\n[Global Setup] Target Base URL: ${baseURL}`);


  const browser = await chromium.launch({ headless: true });

  // ====================== ADMIN AUTH ======================
  try {
    const adminContext = await browser.newContext();
    const page = await adminContext.newPage();
    const adminUrl = normalizeUrl(baseURL, 'admin-login');

    console.log(`[Global Setup] Logging in as Admin at ${adminUrl}...`);
    await page.goto(adminUrl, { timeout: 25000, waitUntil: 'domcontentloaded' });

    const adminUser = process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL || 'admin@digigold.in';
    const adminPass = process.env.ADMIN_PASSWORD || 'Admin@12345';

    const userInput = page.locator('input[name="username"], input[name="email"], input[placeholder*="admin"]');
    await userInput.waitFor({ state: 'visible', timeout: 10000 });
    await userInput.fill(adminUser);

    const passInput = page.locator('input[name="password"]');
    await passInput.fill(adminPass);

    const submitBtn = page.getByRole('button', { name: /sign in|login/i });
    await submitBtn.click();

    // Wait for redirect to /dashboard
    await page.waitForURL(/.*dashboard/i, { timeout: 15000 });

    const adminAuthFile = path.join(authDir, 'admin.json');
    await adminContext.storageState({ path: adminAuthFile });
    console.log(`[Global Setup] ✓ Admin auth saved → ${adminAuthFile}`);
    await adminContext.close();
  } catch (err: any) {
    console.warn(`[Global Setup] ⚠ Admin login setup failed: ${err?.message || err}`);
    console.warn('[Global Setup] Ensure twenty4_digigold backend is running and ADMIN_USERNAME / ADMIN_PASSWORD are correct.');
    // Create an empty auth file so Playwright project config doesn't fail immediately on missing file
    const adminAuthFile = path.join(authDir, 'admin.json');
    if (!fs.existsSync(adminAuthFile)) {
      fs.writeFileSync(adminAuthFile, JSON.stringify({ cookies: [], origins: [] }, null, 2));
    }
  }

  // ====================== CUSTOMER AUTH ======================
  try {
    const customerContext = await browser.newContext();
    const page = await customerContext.newPage();
    const customerUrl = normalizeUrl(baseURL, 'login');

    console.log(`[Global Setup] Logging in as Customer at ${customerUrl}...`);
    await page.goto(customerUrl, { timeout: 25000, waitUntil: 'domcontentloaded' });

    const mobile = process.env.CUSTOMER_MOBILE || '9876543210';
    const fallbackOtp = process.env.CUSTOMER_OTP || '123456';

    const mobileInput = page.locator('input#mobile, input[autocomplete="tel-national"], input[placeholder*="98765"]');
    await mobileInput.waitFor({ state: 'visible', timeout: 10000 });
    await mobileInput.fill(mobile);

    const sendOtpBtn = page.getByRole('button', { name: /send otp/i });
    await sendOtpBtn.click();

    const otpInput = page.locator('input#otp, input[autocomplete="one-time-code"]');
    await otpInput.waitFor({ state: 'visible', timeout: 15000 });

    let otpToEnter = fallbackOtp;
    const testOtpBanner = page.locator('text=/your OTP is/i');
    if (await testOtpBanner.isVisible({ timeout: 1500 }).catch(() => false)) {
      const text = await testOtpBanner.innerText();
      const match = text.match(/\b\d{6}\b/);
      if (match) otpToEnter = match[0];
    }

    await otpInput.fill(otpToEnter);

    const verifyBtn = page.getByRole('button', { name: /verify/i });
    await verifyBtn.click();

    // Wait for redirect to /account
    await page.waitForURL(/.*account/i, { timeout: 15000 });

    const customerAuthFile = path.join(authDir, 'customer.json');
    await customerContext.storageState({ path: customerAuthFile });
    console.log(`[Global Setup] ✓ Customer auth saved → ${customerAuthFile}`);
    await customerContext.close();
  } catch (err: any) {
    console.warn(`[Global Setup] ⚠ Customer login setup failed: ${err?.message || err}`);
    console.warn('[Global Setup] Ensure twenty4_digigold backend is running and OTP Test Mode is enabled.');
    const customerAuthFile = path.join(authDir, 'customer.json');
    if (!fs.existsSync(customerAuthFile)) {
      fs.writeFileSync(customerAuthFile, JSON.stringify({ cookies: [], origins: [] }, null, 2));
    }
  }

  await browser.close();
  console.log('[Global Setup] Completed.\n');
}

export default globalSetup;