import { Page } from '@playwright/test';

/**
 * Log in to Twenty4 DigiGold Admin Panel
 * Admin login route: /admin-login
 * Success redirect: /dashboard
 */
export async function loginAsAdmin(page: Page) {
  const adminUser = process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL || 'admin@digigold.in';
  const adminPass = process.env.ADMIN_PASSWORD || 'Admin@12345';

  await page.goto('admin-login');

  // Username/email input
  const usernameInput = page.locator('input[name="username"], input[name="email"], input[placeholder*="admin"]');
  await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
  await usernameInput.fill(adminUser);

  // Password input
  const passwordInput = page.locator('input[name="password"]');
  await passwordInput.fill(adminPass);

  // Submit button
  const submitBtn = page.getByRole('button', { name: /sign in|login/i });
  await submitBtn.click();

  // Admin redirects to /dashboard
  await page.waitForURL(/.*dashboard/i, { timeout: 20000 });
}

/**
 * Log in to Twenty4 DigiGold Storefront as Customer
 * Customer login route: /login
 * Authentication method: 10-digit Mobile + 6-digit OTP (Test mode OTP: 123456)
 * Success redirect: /account
 */
export async function loginAsCustomer(page: Page) {
  const mobile = process.env.CUSTOMER_MOBILE || '9876543210';
  const fallbackOtp = process.env.CUSTOMER_OTP || '123456';

  await page.goto('login');

  // Step 1: Mobile number input
  const mobileInput = page.locator('input#mobile, input[autocomplete="tel-national"], input[placeholder*="98765"]');
  await mobileInput.waitFor({ state: 'visible', timeout: 10000 });
  await mobileInput.fill(mobile);

  // Click Send OTP
  const sendOtpBtn = page.getByRole('button', { name: /send otp/i });
  await sendOtpBtn.click();

  // Step 2: OTP input
  const otpInput = page.locator('input#otp, input[autocomplete="one-time-code"]');
  await otpInput.waitFor({ state: 'visible', timeout: 15000 });

  // In test mode, Twenty4 DigiGold shows the OTP on screen in a banner ("your OTP is 123456")
  let otpToEnter = fallbackOtp;
  const testOtpBanner = page.locator('text=/your OTP is/i');
  if (await testOtpBanner.isVisible({ timeout: 1500 }).catch(() => false)) {
    const text = await testOtpBanner.innerText();
    const match = text.match(/\b\d{6}\b/);
    if (match) otpToEnter = match[0];
  }

  await otpInput.fill(otpToEnter);

  // Click Verify & continue
  const verifyBtn = page.getByRole('button', { name: /verify/i });
  await verifyBtn.click();

  // Customer redirects to /account
  await page.waitForURL(/.*account/i, { timeout: 20000 });
}

/**
 * Logout from current session
 */
export async function logout(page: Page) {
  // Try UI logout button if visible
  const logoutBtn = page.getByRole('button', { name: /logout|sign out/i });
  if (await logoutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await logoutBtn.click();
    await page.waitForLoadState('networkidle');
  } else {
    // Or call logout endpoints directly
    await page.goto('login');
  }
}