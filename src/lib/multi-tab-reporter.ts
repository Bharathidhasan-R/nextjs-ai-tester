import fs from 'fs';
import path from 'path';

export interface MenuTestResult {
  executionId: string;
  timestamp: string;
  environment: 'local' | 'live';
  testMode: 'playwright' | 'ai' | 'hybrid';
  menuName: string;
  submenuName: string;
  pageUrl: string;
  testCaseId: string;
  testCaseName: string;
  operation: 'List' | 'Add' | 'View' | 'Update' | 'Delete' | 'Settings' | 'Security' | 'Workflow';
  apiEndpoint?: string;
  httpMethod?: string;
  testDataId?: string;
  expectedResult: string;
  actualResult: string;
  status: 'Pass' | 'Fail' | 'Skipped' | 'Error';
  durationMs: number;
  screenshotPath?: string;
  errorDetails?: string;
  reproductionSteps?: string;
}

export class MultiTabReportManager {
  private reportsDir: string;
  private executionId: string;
  private env: 'local' | 'live';
  private mode: 'playwright' | 'ai' | 'hybrid';

  constructor(executionId?: string, env?: 'local' | 'live', mode?: 'playwright' | 'ai' | 'hybrid') {
    this.reportsDir = path.resolve(process.cwd(), 'reports');
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
    this.executionId = executionId || `EXEC-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
    this.env = env || (process.env.TARGET_ENV === 'live' ? 'live' : 'local');
    this.mode = mode || (process.env.TEST_MODE as any) || 'playwright';
  }

  private escapeCsv(str?: string | number): string {
    if (str === undefined || str === null) return '""';
    return `"${String(str).replace(/"/g, '""')}"`;
  }

  private appendRowToCsv(record: MenuTestResult, filename: string) {
    const filePath = path.join(this.reportsDir, filename);
    const headers = [
      'Execution ID',
      'Timestamp',
      'Environment',
      'Testing Mode',
      'Menu',
      'Submenu',
      'Page URL',
      'Test Case ID',
      'Test Case Name',
      'Operation',
      'API Endpoint',
      'HTTP Method',
      'Test Data Identifier',
      'Expected Result',
      'Actual Result',
      'Status',
      'Duration (ms)',
      'Screenshot Path / URL',
      'Error Details',
      'Reproduction Steps',
    ];

    const row = [
      record.executionId,
      record.timestamp,
      record.environment,
      record.testMode,
      this.escapeCsv(record.menuName),
      this.escapeCsv(record.submenuName),
      this.escapeCsv(record.pageUrl),
      record.testCaseId,
      this.escapeCsv(record.testCaseName),
      record.operation,
      this.escapeCsv(record.apiEndpoint || 'N/A'),
      record.httpMethod || 'N/A',
      this.escapeCsv(record.testDataId || 'N/A'),
      this.escapeCsv(record.expectedResult),
      this.escapeCsv(record.actualResult),
      record.status,
      record.durationMs,
      this.escapeCsv(record.screenshotPath || 'N/A'),
      this.escapeCsv(record.errorDetails || ''),
      this.escapeCsv(record.reproductionSteps || ''),
    ];

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, headers.join(',') + '\n' + row.join(',') + '\n', 'utf-8');
    } else {
      fs.appendFileSync(filePath, row.join(',') + '\n', 'utf-8');
    }
  }

  public addRecord(
    category: 'UI' | 'CRUD' | 'API' | 'E2E' | 'Security',
    record: Omit<MenuTestResult, 'executionId' | 'timestamp' | 'environment' | 'testMode'>
  ) {
    const fullRecord: MenuTestResult = {
      ...record,
      executionId: this.executionId,
      timestamp: new Date().toISOString(),
      environment: this.env,
      testMode: this.mode,
    };

    let targetFile = '02_ui_testing.csv';
    switch (category) {
      case 'UI':
        targetFile = '02_ui_testing.csv';
        break;
      case 'CRUD':
        targetFile = '03_crud_functional.csv';
        break;
      case 'API':
        targetFile = '04_api_testing.csv';
        break;
      case 'E2E':
        targetFile = '05_e2e_testing.csv';
        break;
      case 'Security':
        targetFile = '06_security_permissions.csv';
        break;
    }

    this.appendRowToCsv(fullRecord, targetFile);

    // Also append to the summary accumulator
    this.updateSummaryCsv();
  }

  private updateSummaryCsv() {
    const summaryPath = path.join(this.reportsDir, '07_execution_summary.csv');
    const countRecords = (file: string) => {
      const p = path.join(this.reportsDir, file);
      if (!fs.existsSync(p)) return 0;
      const lines = fs.readFileSync(p, 'utf-8').trim().split('\n');
      return Math.max(0, lines.length - 1);
    };

    const uiCount = countRecords('02_ui_testing.csv');
    const crudCount = countRecords('03_crud_functional.csv');
    const apiCount = countRecords('04_api_testing.csv');
    const e2eCount = countRecords('05_e2e_testing.csv');
    const secCount = countRecords('06_security_permissions.csv');
    const total = uiCount + crudCount + apiCount + e2eCount + secCount;

    const summaryHeaders = [
      'Execution ID',
      'Timestamp',
      'Environment',
      'Testing Mode',
      'Total Tests Executed',
      'UI Tests (Tab 2)',
      'CRUD Tests (Tab 3)',
      'API Tests (Tab 4)',
      'E2E Tests (Tab 5)',
      'Security Tests (Tab 6)',
    ];

    const summaryRow = [
      this.executionId,
      new Date().toISOString(),
      this.env,
      this.mode,
      total,
      uiCount,
      crudCount,
      apiCount,
      e2eCount,
      secCount,
    ];

    fs.writeFileSync(summaryPath, summaryHeaders.join(',') + '\n' + summaryRow.join(',') + '\n', 'utf-8');
  }

  public generateAllReports() {
    this.updateSummaryCsv();
    this.writeMarkdownSummary();
  }

  private writeMarkdownSummary() {
    const mdPath = path.join(this.reportsDir, 'ADMIN_COMPLETE_REPORT.md');
    const countRecords = (file: string) => {
      const p = path.join(this.reportsDir, file);
      if (!fs.existsSync(p)) return 0;
      const lines = fs.readFileSync(p, 'utf-8').trim().split('\n');
      return Math.max(0, lines.length - 1);
    };

    const inventoryCount = countRecords('01_menu_inventory.csv');
    const uiCount = countRecords('02_ui_testing.csv');
    const crudCount = countRecords('03_crud_functional.csv');
    const apiCount = countRecords('04_api_testing.csv');
    const e2eCount = countRecords('05_e2e_testing.csv');
    const secCount = countRecords('06_security_permissions.csv');
    const total = uiCount + crudCount + apiCount + e2eCount + secCount;

    let md = `# 🛡️ Admin Panel Complete Menu-Wise Testing Report\n\n`;
    md += `> **Execution ID**: \`${this.executionId}\` | **Timestamp**: ${new Date().toLocaleString()}\n`;
    md += `> **Environment**: \`${this.env.toUpperCase()}\` | **Mode**: \`${this.mode.toUpperCase()}\`\n\n`;

    md += `## 1. Executive Summary & Google Sheets Worksheet Tabs\n\n`;
    md += `| Worksheet Tab | Status | Records | Output CSV File |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    md += `| **1. Menu Inventory** | ✅ Complete | ${inventoryCount} menus | \`reports/01_menu_inventory.csv\` |\n`;
    md += `| **2. UI Testing** | ✅ Complete | ${uiCount} tests | \`reports/02_ui_testing.csv\` |\n`;
    md += `| **3. CRUD Functional** | ✅ Complete | ${crudCount} tests | \`reports/03_crud_functional.csv\` |\n`;
    md += `| **4. API Testing** | ✅ Complete | ${apiCount} tests | \`reports/04_api_testing.csv\` |\n`;
    md += `| **5. End-to-End** | ✅ Complete | ${e2eCount} tests | \`reports/05_e2e_testing.csv\` |\n`;
    md += `| **6. Security & Perms** | ✅ Complete | ${secCount} tests | \`reports/06_security_permissions.csv\` |\n`;
    md += `| **7. Execution Summary** | ✅ Complete | **${total} Tests** | \`reports/07_execution_summary.csv\` |\n\n`;

    md += `## 2. Google Sheets Synchronization\n\n`;
    md += `To synchronize these results with the tracking spreadsheet at [${process.env.TESTING_DOC_URL}](${process.env.TESTING_DOC_URL}):\n\n`;
    md += `1. **Menu Inventory**: Import \`reports/01_menu_inventory.csv\` into sheet tab **"Menu Inventory"**\n`;
    md += `2. **UI Testing**: Import \`reports/02_ui_testing.csv\` into sheet tab **"UI Testing"**\n`;
    md += `3. **CRUD Functional Testing**: Import \`reports/03_crud_functional.csv\` into sheet tab **"CRUD Functional Testing"**\n`;
    md += `4. **API Testing**: Import \`reports/04_api_testing.csv\` into sheet tab **"API Testing"**\n`;
    md += `5. **End-to-End Testing**: Import \`reports/05_e2e_testing.csv\` into sheet tab **"End-to-End Testing"**\n`;
    md += `6. **Security and Permissions**: Import \`reports/06_security_permissions.csv\` into sheet tab **"Security and Permissions"**\n`;
    md += `7. **Execution Summary**: Import \`reports/07_execution_summary.csv\` into sheet tab **"Execution Summary"**\n`;

    fs.writeFileSync(mdPath, md, 'utf-8');
  }
}
