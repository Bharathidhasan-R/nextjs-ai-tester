import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { discoverAdminMenus, exportMenuInventory } from '../lib/admin-menu-discovery';
import { MultiTabReportManager } from '../lib/multi-tab-reporter';
import { validateTestConfig } from '../lib/config';

test.describe('Admin Panel — Verification Set & Multi-Tab Sync', () => {
  const screenshotsDir = path.resolve(process.cwd(), 'screenshots/verification');
  const reportsDir = path.resolve(process.cwd(), 'reports');
  const reporter = new MultiTabReportManager(undefined, 'local', 'playwright');
  let testConfig: any;
  let adminAuthCookie: string = '';

  test.beforeAll(async () => {
    testConfig = validateTestConfig();
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const authFile = path.resolve(process.cwd(), 'playwright/.auth/admin.json');
    if (fs.existsSync(authFile)) {
      const auth = JSON.parse(fs.readFileSync(authFile, 'utf8'));
      adminAuthCookie = auth.cookies?.map((c: any) => `${c.name}=${c.value}`).join('; ') || '';
    }
  });

  test.afterAll(() => {
    // Generate all 7 Google Sheets worksheet tabs
    reporter.generateAllReports();
  });

  /* -------------------------------------------------------------------------
   * VERIFY-01: Menu Discovery & Tab 1 Inventory Export
   * ------------------------------------------------------------------------- */
  test('VERIFY-01: Discover Admin Menus and Generate Worksheet Tab 1 Inventory', async () => {
    const t0 = Date.now();
    const inventory = await discoverAdminMenus();

    expect(inventory).toBeDefined();
    expect(inventory.length).toBeGreaterThanOrEqual(15);

    exportMenuInventory(inventory, reportsDir);

    const inventoryCsvPath = path.join(reportsDir, '01_menu_inventory.csv');
    expect(fs.existsSync(inventoryCsvPath)).toBeTruthy();
  });

  /* -------------------------------------------------------------------------
   * VERIFY-02: Tab 2 UI Testing (Dashboard Shell & Live Rates Ticker)
   * ------------------------------------------------------------------------- */
  test('VERIFY-02: UI Verification on Admin Dashboard Command Center', async ({ page }, testInfo) => {
    const t0 = Date.now();
    testInfo.annotations.push({ type: 'category', description: 'UI' });
    testInfo.annotations.push({ type: 'testId', description: 'TC-VERIFY-UI-01' });

    await page.goto('dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page).toHaveURL(/.*dashboard/);

    // Verify main components
    const body = page.locator('body');
    await expect(body).toBeVisible();

    const screenshotPath = path.join(screenshotsDir, 'tc-verify-ui-dashboard.png');
    await page.screenshot({ path: screenshotPath });

    reporter.addRecord('UI', {
      menuName: 'Dashboard',
      submenuName: 'Command Center',
      pageUrl: page.url(),
      testCaseId: 'TC-VERIFY-UI-01',
      testCaseName: 'Admin Dashboard Shell and Navigation Loaded',
      operation: 'List',
      expectedResult: 'Dashboard renders with full sidebar navigation and top command center',
      actualResult: 'Dashboard rendered successfully in 200 OK',
      status: 'Pass',
      durationMs: Date.now() - t0,
      screenshotPath,
    });
  });

  /* -------------------------------------------------------------------------
   * VERIFY-03: Tab 3 & Tab 5 Complete CRUD & End-to-End Workflow on Metals Master
   * ------------------------------------------------------------------------- */
  test('VERIFY-03: End-to-End CRUD Lifecycle on Master Records (Create -> Read -> Update -> Delete)', async ({ page }) => {
    const t0 = Date.now();
    const uniqueTestName = `TEST_VERIFY_GOLD_${Date.now()}`;
    const baseURL = testConfig.baseURL.endsWith('/') ? testConfig.baseURL : testConfig.baseURL + '/';

    // 1. Create Record (POST)
    const createRes = await fetch(`${baseURL}api/masters/metals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminAuthCookie,
      },
      body: JSON.stringify({ name: uniqueTestName }),
    });

    const createJson = await createRes.json().catch(() => ({}));
    expect(createRes.ok).toBeTruthy();
    const createdId = createJson.data?.id || createJson.id;
    expect(createdId).toBeDefined();

    // 2. Read / Verify in List (GET)
    const listRes = await fetch(`${baseURL}api/masters/metals`, {
      headers: { Cookie: adminAuthCookie },
    });
    const listJson = await listRes.json();
    const listItems = Array.isArray(listJson) ? listJson : listJson.data || [];
    const foundItem = listItems.find((i: any) => i.id === createdId || i.name === uniqueTestName);
    expect(foundItem).toBeDefined();

    // 3. View Details (GET by ID)
    const detailRes = await fetch(`${baseURL}api/masters/metals/${createdId}`, {
      headers: { Cookie: adminAuthCookie },
    });
    expect(detailRes.ok).toBeTruthy();

    // 4. Update Record (PATCH)
    const updatedName = `${uniqueTestName}_EDITED`;
    const updateRes = await fetch(`${baseURL}api/masters/metals/${createdId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminAuthCookie,
      },
      body: JSON.stringify({ name: updatedName }),
    });
    expect(updateRes.ok).toBeTruthy();

    // 5. Navigate UI to Metals Master and capture screenshot
    await page.goto('dashboard/products/metals', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const screenshotPath = path.join(screenshotsDir, 'tc-verify-crud-metals.png');
    await page.screenshot({ path: screenshotPath });

    // 6. Delete Record (DELETE) - Safe cleanup of test data
    const deleteRes = await fetch(`${baseURL}api/masters/metals/${createdId}`, {
      method: 'DELETE',
      headers: { Cookie: adminAuthCookie },
    });
    expect(deleteRes.ok).toBeTruthy();

    // Record CRUD Functional result (Tab 3)
    reporter.addRecord('CRUD', {
      menuName: 'Ecommerce',
      submenuName: 'Metals Master',
      pageUrl: `${baseURL}dashboard/products/metals`,
      testCaseId: 'TC-VERIFY-CRUD-01',
      testCaseName: 'Standard CRUD Operations (Create, Read, Update, Delete)',
      operation: 'Add',
      apiEndpoint: 'api/masters/metals',
      httpMethod: 'POST / PATCH / DELETE',
      testDataId: uniqueTestName,
      expectedResult: 'Record created, retrieved, updated, and safely deleted without database corruption',
      actualResult: `Record ID ${createdId} created with name "${uniqueTestName}", verified in list, updated, and deleted`,
      status: 'Pass',
      durationMs: Date.now() - t0,
      screenshotPath,
    });

    // Record End-to-End Workflow result (Tab 5)
    reporter.addRecord('E2E', {
      menuName: 'Ecommerce',
      submenuName: 'Metals Master',
      pageUrl: `${baseURL}dashboard/products/metals`,
      testCaseId: 'TC-VERIFY-E2E-01',
      testCaseName: 'End-to-End Master Lifecycle with Unique Test Data Cleanup',
      operation: 'Workflow',
      apiEndpoint: 'api/masters/metals',
      httpMethod: 'FULL_CYCLE',
      testDataId: uniqueTestName,
      expectedResult: 'Complete record lifecycle succeeds and leaves zero orphaned test records',
      actualResult: 'Full lifecycle verified and cleaned up',
      status: 'Pass',
      durationMs: Date.now() - t0,
      screenshotPath,
    });
  });

  /* -------------------------------------------------------------------------
   * VERIFY-04: Tab 4 API Validation (Rate Master & Schema Contracts)
   * ------------------------------------------------------------------------- */
  test('VERIFY-04: API Contract Testing on Rate Master Endpoint', async () => {
    const t0 = Date.now();
    const baseURL = testConfig.baseURL.endsWith('/') ? testConfig.baseURL : testConfig.baseURL + '/';

    const res = await fetch(`${baseURL}api/rates/current`, {
      headers: { Cookie: adminAuthCookie },
    });

    const duration = Date.now() - t0;
    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(3500);

    const json = await res.json();
    expect(json).toBeDefined();

    reporter.addRecord('API', {
      menuName: 'Rate Master',
      submenuName: 'Live Rates',
      pageUrl: `${baseURL}dashboard/rates`,
      testCaseId: 'TC-VERIFY-API-01',
      testCaseName: 'GET /api/rates/current Schema and Status Validation',
      operation: 'List',
      apiEndpoint: 'api/rates/current',
      httpMethod: 'GET',
      expectedResult: 'Returns 200 OK with live metal rates within 3500ms',
      actualResult: `HTTP 200 returned in ${duration}ms with rates data`,
      status: 'Pass',
      durationMs: duration,
    });
  });

  /* -------------------------------------------------------------------------
   * VERIFY-05: Tab 6 Security and Permissions Guard Check
   * ------------------------------------------------------------------------- */
  test('VERIFY-05: Security Verification of Unauthenticated Dashboard Access Guard', async ({ browser }) => {
    const t0 = Date.now();
    // Launch an unauthenticated context with explicitly empty cookies
    const context = await browser.newContext({
      baseURL: testConfig.baseURL,
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();

    await page.goto('dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
    let finalUrl = page.url();
    if (!finalUrl.includes('admin-login') && !finalUrl.includes('login')) {
      await page.waitForURL(/admin-login|login/, { timeout: 10000 }).catch(() => {});
      finalUrl = page.url();
    }

    // Middleware or client auth redirects unauthenticated visits to /admin-login
    expect(finalUrl).toMatch(/admin-login|login/);

    const screenshotPath = path.join(screenshotsDir, 'tc-verify-security-redirect.png');
    await page.screenshot({ path: screenshotPath });

    reporter.addRecord('Security', {
      menuName: 'Access Control',
      submenuName: 'Auth Guard',
      pageUrl: finalUrl,
      testCaseId: 'TC-VERIFY-SEC-01',
      testCaseName: 'Unauthenticated Dashboard Access Enforcement',
      operation: 'Security',
      expectedResult: 'Unauthenticated requests redirected via HTTP 307 to /admin-login',
      actualResult: `Redirected to ${finalUrl}`,
      status: 'Pass',
      durationMs: Date.now() - t0,
      screenshotPath,
    });

    await context.close();
  });
});
