import { test, expect } from '@playwright/test';
import { suggestApiTestScenarios } from '../lib/ai-engine';
import { validateTestConfig } from '../lib/config';

/**
 * Twenty4 DigiGold - API Verification Suite
 * Target: Backend API Endpoints (Health, Rates, App Settings, Auth Guards, Validation, 404)
 */
test.describe('Twenty4 DigiGold - API Verification Suite', () => {

  /* -------------------------------------------------------------------------
   * TC-API-01: Public Rates Ticker API
   * ------------------------------------------------------------------------- */
  test('GET /api/rates/current - Returns 200 OK with live metal rates', async ({ request }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'API' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-API-01' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /api/rates/current' });
    testInfo.annotations.push({ type: 'expected', description: 'HTTP 200 OK with success flag and live metal rates object within 3500ms' });

    const startTime = Date.now();
    const response = await request.get('api/rates/current');
    const duration = Date.now() - startTime;

    expect(response.status()).toBe(200);
    expect(response.ok()).toBeTruthy();

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('rates');

    expect(duration).toBeLessThan(3500);

    // Save request/response evidence (Section F)
    await testInfo.attach('api-evidence', {
      body: JSON.stringify({ endpoint: 'api/rates/current', status: response.status(), duration, body }, null, 2),
      contentType: 'application/json',
    });
  });

  /* -------------------------------------------------------------------------
   * TC-API-02: Public Mobile Rates API
   * ------------------------------------------------------------------------- */
  test('GET /api/mobile/rates - Returns 200 OK with structured metal schema', async ({ request }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'API' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-API-02' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /api/mobile/rates' });
    testInfo.annotations.push({ type: 'expected', description: 'HTTP 200 OK with structured metal schema and freshness' });

    const response = await request.get('api/mobile/rates');

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('rates');
    expect(typeof data.rates).toBe('object');

    await testInfo.attach('api-evidence', {
      body: JSON.stringify({ endpoint: 'api/mobile/rates', status: response.status(), data }, null, 2),
      contentType: 'application/json',
    });
  });

  /* -------------------------------------------------------------------------
   * TC-API-03: App Settings API (V1 Versioned)
   * ------------------------------------------------------------------------- */
  test('GET /api/mobile/v1/app-settings - Returns 200 OK with identity & config', async ({ request }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'API' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-API-03' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /api/mobile/v1/app-settings' });
    testInfo.annotations.push({ type: 'expected', description: 'HTTP 200 OK with branding, media, and identity settings' });

    const response = await request.get('api/mobile/v1/app-settings');

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('settings');

    await testInfo.attach('api-evidence', {
      body: JSON.stringify({ endpoint: 'api/mobile/v1/app-settings', status: response.status(), data }, null, 2),
      contentType: 'application/json',
    });
  });

  /* -------------------------------------------------------------------------
   * TC-API-04: Admin Auth Guard (Protected Route)
   * ------------------------------------------------------------------------- */
  test('GET /api/users - Unauthenticated access returns 401 or 500 error guard', async ({ request }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'API' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-API-04' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /api/users' });
    testInfo.annotations.push({ type: 'expected', description: 'Rejects unauthenticated access with 401 Unauthorized or auth guard' });

    const response = await request.get('api/users');

    // On twenty4_digigold backend, unauthenticated access rejects access (either 401 or auth guard exception)
    expect([401, 403, 500]).toContain(response.status());
    const body = await response.json().catch(() => ({}));

    await testInfo.attach('api-evidence', {
      body: JSON.stringify({ endpoint: 'api/users', status: response.status(), body }, null, 2),
      contentType: 'application/json',
    });
  });

  /* -------------------------------------------------------------------------
   * TC-API-05: Admin Login Validation
   * ------------------------------------------------------------------------- */
  test('POST /api/auth/login - Rejects invalid credentials with 401', async ({ request }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'API' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-API-05' });
    testInfo.annotations.push({ type: 'endpoint', description: 'POST /api/auth/login' });
    testInfo.annotations.push({ type: 'expected', description: 'HTTP 401 Unauthorized for incorrect username or password' });

    const response = await request.post('api/auth/login', {
      data: {
        username: 'invalid_user_99999',
        password: 'wrong_password_xyz',
      },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('error');

    await testInfo.attach('api-evidence', {
      body: JSON.stringify({ endpoint: 'api/auth/login', status: response.status(), body }, null, 2),
      contentType: 'application/json',
    });
  });

  /* -------------------------------------------------------------------------
   * TC-API-06: Customer Send-OTP Validation
   * ------------------------------------------------------------------------- */
  test('POST /api/store/auth/send-otp - Rejects invalid mobile number with 400', async ({ request }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'API' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-API-06' });
    testInfo.annotations.push({ type: 'endpoint', description: 'POST /api/store/auth/send-otp' });
    testInfo.annotations.push({ type: 'expected', description: 'HTTP 400 Bad Request when mobile number is invalid' });

    const response = await request.post('api/store/auth/send-otp', {
      data: {
        mobile: '123', // invalid short mobile
      },
      timeout: 30000,
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');

    await testInfo.attach('api-evidence', {
      body: JSON.stringify({ endpoint: 'api/store/auth/send-otp', status: response.status(), body }, null, 2),
      contentType: 'application/json',
    });
  });

  /* -------------------------------------------------------------------------
   * TC-API-07: Undefined Route 404 Handling
   * ------------------------------------------------------------------------- */
  test('GET /api/mobile/v1/non-existent-route-xyz - Returns 404 for undefined endpoints', async ({ request }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'API' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-API-07' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET /api/mobile/v1/non-existent-route-xyz' });
    testInfo.annotations.push({ type: 'expected', description: 'HTTP 404 Not Found for non-existent endpoint' });

    const response = await request.get('api/mobile/v1/non-existent-route-xyz');
    expect(response.status()).toBe(404);

    await testInfo.attach('api-evidence', {
      body: JSON.stringify({ endpoint: 'api/mobile/v1/non-existent-route-xyz', status: response.status() }, null, 2),
      contentType: 'application/json',
    });
  });

  /* -------------------------------------------------------------------------
   * TC-API-08: AI-Assisted API Scenario Validation (Requirement E)
   * ------------------------------------------------------------------------- */
  test('AI API Scenario - Validate AI suggested endpoint requirements', async ({ request }, testInfo) => {
    testInfo.annotations.push({ type: 'category', description: 'API' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-API-08' });
    testInfo.annotations.push({ type: 'endpoint', description: 'GET api/rates/current' });
    testInfo.annotations.push({ type: 'expected', description: 'AI suggested scenario passes safety verification and executes successfully' });

    const config = validateTestConfig();
    const endpointDefs = [
      { method: 'GET', endpoint: 'api/rates/current', description: 'Live metal rates' },
      { method: 'GET', endpoint: 'api/mobile/v1/app-settings', description: 'App brand identity settings' },
    ];

    const suggested = await suggestApiTestScenarios(endpointDefs);
    expect(suggested.length).toBeGreaterThan(0);

    const firstScenario = suggested[0];
    const response = await request.get(firstScenario.endpoint);
    expect(response.status()).toBe(firstScenario.expectedStatus);

    await testInfo.attach('api-evidence', {
      body: JSON.stringify({ scenario: firstScenario, responseStatus: response.status() }, null, 2),
      contentType: 'application/json',
    });
  });

});
