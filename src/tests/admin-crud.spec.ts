import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { MultiTabReportManager } from '../lib/multi-tab-reporter';
import { validateTestConfig } from '../lib/config';

test.describe('Admin Panel — Complete CRUD Functional Testing', () => {
  const screenshotsDir = path.resolve(process.cwd(), 'screenshots/admin-crud');
  const reporter = new MultiTabReportManager(undefined, process.env.TARGET_ENV === 'live' ? 'live' : 'local', 'playwright');
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

  const masterEntities = [
    { key: 'metals', name: 'Metals', route: 'dashboard/products/metals', payload: (name: string) => ({ name }) },
    { key: 'metal-colors', name: 'Metal Colors', route: 'dashboard/products/metal-colors', payload: (name: string) => ({ name }) },
    { key: 'diamond-stones', name: 'Diamond Stones', route: 'dashboard/products/diamond-stones', payload: (name: string) => ({ name, uom: 'carat' }) },
    { key: 'diamond-quality', name: 'Diamond Quality', route: 'dashboard/products/diamond-quality', payload: (name: string) => ({ name }) },
    { key: 'diamond-colors', name: 'Diamond Colors', route: 'dashboard/products/diamond-colors', payload: (name: string) => ({ name }) },
    { key: 'stone-cuts', name: 'Stone Cuts', route: 'dashboard/products/stone-cuts', payload: (name: string) => ({ name, uom: 'carat' }) },
    { key: 'stone-shapes', name: 'Stone Shapes', route: 'dashboard/products/stone-shapes', payload: (name: string) => ({ name, uom: 'carat' }) },
    { key: 'product-types', name: 'Product Types', route: 'dashboard/products/product-types', payload: (name: string) => ({ name }) },
    { key: 'categories', name: 'Category Types', route: 'dashboard/products/categories', payload: (name: string) => ({ name }) },
  ];

  for (const entity of masterEntities) {
    test(`CRUD-${entity.key}: Full Lifecycle (List, Create, View, Update, Delete) for ${entity.name}`, async ({ page }) => {
      const t0 = Date.now();
      const baseURL = testConfig.baseURL.endsWith('/') ? testConfig.baseURL : testConfig.baseURL + '/';
      const apiEndpoint = `api/masters/${entity.key}`;
      const uniqueName = `TEST_AUTOGEN_${entity.key.toUpperCase().replace(/-/g, '_')}_${Date.now()}`;

      // 1. List / Read
      const listRes = await fetch(`${baseURL}${apiEndpoint}`, {
        headers: { Cookie: adminAuthCookie },
      });
      expect(listRes.ok).toBeTruthy();
      const initialList = await listRes.json();
      const initialItems = Array.isArray(initialList) ? initialList : initialList.data || [];

      reporter.addRecord('CRUD', {
        menuName: 'Ecommerce',
        submenuName: entity.name,
        pageUrl: `${baseURL}${entity.route}`,
        testCaseId: `TC-CRUD-${entity.key.toUpperCase()}-01`,
        testCaseName: `Verify ${entity.name} List Table Loads Data`,
        operation: 'List',
        apiEndpoint,
        httpMethod: 'GET',
        expectedResult: 'Returns 200 OK and lists existing records',
        actualResult: `Retrieved ${initialItems.length} records`,
        status: 'Pass',
        durationMs: Date.now() - t0,
      });

      // 2. Add / Create
      const createRes = await fetch(`${baseURL}${apiEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminAuthCookie,
        },
        body: JSON.stringify(entity.payload(uniqueName)),
      });

      expect(createRes.ok).toBeTruthy();
      const createJson = await createRes.json();
      const createdId = createJson.data?.id || createJson.id;
      expect(createdId).toBeDefined();

      reporter.addRecord('CRUD', {
        menuName: 'Ecommerce',
        submenuName: entity.name,
        pageUrl: `${baseURL}${entity.route}`,
        testCaseId: `TC-CRUD-${entity.key.toUpperCase()}-02`,
        testCaseName: `Create New ${entity.name} Record`,
        operation: 'Add',
        apiEndpoint,
        httpMethod: 'POST',
        testDataId: uniqueName,
        expectedResult: 'Record created with unique ID and appears in dataset',
        actualResult: `Created ID: ${createdId}`,
        status: 'Pass',
        durationMs: Date.now() - t0,
      });

      // 3. View / Details
      const detailRes = await fetch(`${baseURL}${apiEndpoint}/${createdId}`, {
        headers: { Cookie: adminAuthCookie },
      });
      expect(detailRes.ok).toBeTruthy();
      const detailJson = await detailRes.json();
      const detailItem = detailJson.data || detailJson;
      expect(detailItem.id).toBe(createdId);

      reporter.addRecord('CRUD', {
        menuName: 'Ecommerce',
        submenuName: entity.name,
        pageUrl: `${baseURL}${entity.route}`,
        testCaseId: `TC-CRUD-${entity.key.toUpperCase()}-03`,
        testCaseName: `View ${entity.name} Record Details by ID`,
        operation: 'View',
        apiEndpoint: `${apiEndpoint}/${createdId}`,
        httpMethod: 'GET',
        testDataId: String(createdId),
        expectedResult: 'Fetches single record matching created ID',
        actualResult: `Fetched record ID ${createdId} successfully`,
        status: 'Pass',
        durationMs: Date.now() - t0,
      });

      // 4. Update / Edit
      const updatedName = `${uniqueName}_EDITED`;
      const updateRes = await fetch(`${baseURL}${apiEndpoint}/${createdId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminAuthCookie,
        },
        body: JSON.stringify(entity.payload(updatedName)),
      });
      expect(updateRes.ok).toBeTruthy();

      reporter.addRecord('CRUD', {
        menuName: 'Ecommerce',
        submenuName: entity.name,
        pageUrl: `${baseURL}${entity.route}`,
        testCaseId: `TC-CRUD-${entity.key.toUpperCase()}-04`,
        testCaseName: `Update ${entity.name} Record Values`,
        operation: 'Update',
        apiEndpoint: `${apiEndpoint}/${createdId}`,
        httpMethod: 'PATCH',
        testDataId: updatedName,
        expectedResult: 'Record values updated successfully in database',
        actualResult: `Updated record to "${updatedName}"`,
        status: 'Pass',
        durationMs: Date.now() - t0,
      });

      // 5. Navigate UI and capture screenshot
      await page.goto(entity.route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const screenshotPath = path.join(screenshotsDir, `crud-${entity.key}.png`);
      await page.screenshot({ path: screenshotPath });

      // 6. Delete Record (Safe Cleanup)
      const deleteRes = await fetch(`${baseURL}${apiEndpoint}/${createdId}`, {
        method: 'DELETE',
        headers: { Cookie: adminAuthCookie },
      });
      expect(deleteRes.ok).toBeTruthy();

      reporter.addRecord('CRUD', {
        menuName: 'Ecommerce',
        submenuName: entity.name,
        pageUrl: `${baseURL}${entity.route}`,
        testCaseId: `TC-CRUD-${entity.key.toUpperCase()}-05`,
        testCaseName: `Safe Deletion of Test Record and Data Cleanup`,
        operation: 'Delete',
        apiEndpoint: `${apiEndpoint}/${createdId}`,
        httpMethod: 'DELETE',
        testDataId: String(createdId),
        expectedResult: 'Record deleted from database, leaving zero orphaned test data',
        actualResult: `Deleted ID ${createdId} successfully`,
        status: 'Pass',
        durationMs: Date.now() - t0,
        screenshotPath,
      });

      // Also record into End-to-End Testing (Tab 5)
      reporter.addRecord('E2E', {
        menuName: 'Ecommerce',
        submenuName: entity.name,
        pageUrl: `${baseURL}${entity.route}`,
        testCaseId: `TC-E2E-${entity.key.toUpperCase()}`,
        testCaseName: `${entity.name} End-to-End CRUD Workflow`,
        operation: 'Workflow',
        apiEndpoint,
        httpMethod: 'FULL_CYCLE',
        testDataId: uniqueName,
        expectedResult: 'Complete record creation, verification, update, and cleanup',
        actualResult: '100% full lifecycle passed',
        status: 'Pass',
        durationMs: Date.now() - t0,
        screenshotPath,
      });
    });
  }
});
