import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { validateTestConfig } from './config';

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

  // If running tests that explicitly target admin or customer, always run appropriate auth
  const isExplicitAdminOrCustomerRun = process.argv.some(
    (arg) => arg.includes('admin') || arg.includes('customer')
  );

  // If running tests that don't need auth (public ui, api, visual, public ai) or SKIP_AUTH_SETUP is set, skip login
  const isNonAuthRun =
    !isExplicitAdminOrCustomerRun &&
    (process.env.SKIP_AUTH_SETUP === 'true' ||
      process.argv.some(
        (arg) =>
          arg === '--project=ui' ||
          arg === '--project=visual' ||
          arg === '--project=api' ||
          arg === '--project=ai' ||
          arg === '--project=hybrid' ||
          arg === '--project=playwright' ||
          (arg.includes('ui.spec') && !arg.includes('admin')) ||
          (arg.includes('api.spec') && !arg.includes('admin')) ||
          (arg.includes('visual.spec') && !arg.includes('admin')) ||
          (arg.includes('ai.spec') && !arg.includes('admin'))
      ));

  if (isNonAuthRun) {
    console.log('\n[Global Setup] Skipping auth setup (public UI, API, or Visual suite requested).');
    if (!fs.existsSync(adminAuthFile)) fs.writeFileSync(adminAuthFile, emptyAuth);
    if (!fs.existsSync(customerAuthFile)) fs.writeFileSync(customerAuthFile, emptyAuth);
    return;
  }

  const testConfig = validateTestConfig();
  const baseURL = testConfig.baseURL;
  console.log(`\n[Global Setup] Target Base URL: ${baseURL}`);


  const browser = await chromium.launch({ headless: true });

  // ====================== ADMIN AUTH ======================
  try {
    const adminUser = process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL || 'admin@digigold.in';
    const adminPass = process.env.ADMIN_PASSWORD || 'Admin@12345';
    const adminAuthFile = path.join(authDir, 'admin.json');

    console.log(`[Global Setup] Logging in as Admin (${adminUser}) at ${baseURL}...`);
    const adminContext = await browser.newContext({ baseURL });
    const loginRes = await adminContext.request.post('api/auth/login', {
      data: { username: adminUser, password: adminPass },
      timeout: 15000,
    });

    if (loginRes.ok()) {
      await adminContext.storageState({ path: adminAuthFile });
      console.log(`[Global Setup] ✓ Admin auth saved → ${adminAuthFile}`);
    } else {
      const errBody = await loginRes.text().catch(() => '');
      throw new Error(`Auth API returned ${loginRes.status()}: ${errBody.slice(0, 100)}`);
    }
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
  const isAdminOnlyRun = process.argv.some((arg) => arg.includes('admin'));
  if (isAdminOnlyRun) {
    console.log('[Global Setup] Skipping customer auth for admin test run.');
    if (!fs.existsSync(customerAuthFile)) {
      fs.writeFileSync(customerAuthFile, emptyAuth);
    }
  } else {
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
      if (!fs.existsSync(customerAuthFile)) {
        fs.writeFileSync(customerAuthFile, emptyAuth);
      }
    }
  }

  await browser.close();
  console.log('[Global Setup] Completed.\n');
}

export default globalSetup;