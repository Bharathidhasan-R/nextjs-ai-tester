import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';
import { validateTestConfig, TestConfig } from './config';
import { analyzeTestFailureWithAI } from './ai-engine';

export interface TestRecord {
  executionId: string;
  timestamp: string;
  testMode: string;
  environment: string;
  category: string;
  testCaseId: string;
  pageOrEndpoint: string;
  scenario: string;
  expectedResult: string;
  actualResult: string;
  status: 'Pass' | 'Fail' | 'Skipped';
  durationMs: number;
  errors: string;
  aiAnalysis: string;
  screenshotPath: string;
}

export default class UnifiedReporter implements Reporter {
  private config!: TestConfig;
  private executionId!: string;
  private records: TestRecord[] = [];
  private reportsDir: string;
  private screenshotsDir: string;
  private startTime: number = Date.now();

  constructor() {
    this.reportsDir = path.resolve(process.cwd(), 'reports');
    this.screenshotsDir = path.resolve(process.cwd(), 'screenshots');
  }

  onBegin(fullConfig: FullConfig, suite: Suite) {
    this.startTime = Date.now();
    this.config = validateTestConfig();
    this.executionId = `EXEC-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;

    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
  }

  async onTestEnd(test: TestCase, result: TestResult) {
    const durationMs = result.duration;
    const status: 'Pass' | 'Fail' | 'Skipped' =
      result.status === 'passed' ? 'Pass' : result.status === 'skipped' ? 'Skipped' : 'Fail';

    // Extract annotations
    const getAnnotation = (type: string) =>
      test.annotations.find((a) => a.type.toLowerCase() === type.toLowerCase())?.description || '';

    let endpoint = getAnnotation('endpoint');
    let expectedResult = getAnnotation('expected');
    let testCaseId = getAnnotation('testId') || getAnnotation('id');
    let category = getAnnotation('category');

    // Infer category and ID if not explicitly annotated
    const filePath = test.location.file;
    if (!category) {
      if (filePath.includes('api.spec')) category = 'API';
      else if (filePath.includes('ui.spec')) category = 'UI';
      else if (filePath.includes('ai.spec')) category = 'AI-Assisted';
      else if (filePath.includes('hybrid.spec')) category = 'Hybrid';
      else if (filePath.includes('visual.spec')) category = 'Visual Quality';
      else if (filePath.includes('admin.spec')) category = 'Admin Console';
      else if (filePath.includes('customer.spec')) category = 'Customer Portal';
      else category = 'General';
    }

    if (!testCaseId) {
      const suiteIndex = this.records.length + 1;
      const prefix = category.toUpperCase().slice(0, 3);
      testCaseId = `TC-${prefix}-${String(suiteIndex).padStart(2, '0')}`;
    }

    // Infer endpoint from test title if missing (e.g. "GET /api/rates/current - ...")
    if (!endpoint) {
      const match = test.title.match(/^(GET|POST|PUT|DELETE|PATCH)\s+([^\s-]+)/i);
      if (match) {
        endpoint = `${match[1].toUpperCase()} ${match[2]}`;
      } else {
        endpoint = category === 'UI' ? '/' : 'N/A';
      }
    }

    // Infer expected result from title
    if (!expectedResult) {
      const parts = test.title.split(' - ');
      expectedResult = parts.length > 1 ? parts.slice(1).join(' - ') : test.title;
    }

    // Clean error message
    const rawError = result.errors.map((e) => e.message || '').join('; ');
    const cleanError = rawError
      ? rawError.replace(/\u001b\[[0-9;]*m/g, '').replace(/\r?\n/g, ' ').slice(0, 300)
      : '';

    // Determine actual result
    let actualResult = '';
    if (status === 'Pass') {
      actualResult = `Success: Verified in ${durationMs}ms with expected assertions`;
    } else if (status === 'Skipped') {
      actualResult = 'Test execution was skipped';
    } else {
      actualResult = `Failed: ${cleanError || 'Assertion failure or network timeout'}`;
    }

    // Extract screenshot evidence
    let screenshotPath = '';
    const screenshotAttachment = result.attachments.find(
      (a) =>
        (a.contentType && a.contentType.startsWith('image/')) ||
        (a.name && a.name.toLowerCase().includes('screenshot'))
    );

    if (screenshotAttachment && screenshotAttachment.path) {
      screenshotPath = path.relative(process.cwd(), screenshotAttachment.path).replace(/\\/g, '/');
    }

    // For UI failures with no attachment captured yet, check if there is a file in screenshots/
    if (category !== 'API' && !screenshotPath && status === 'Fail') {
      const possibleName = `${testCaseId.toLowerCase()}-failure.png`;
      const fallbackPath = path.join(this.screenshotsDir, possibleName);
      if (fs.existsSync(fallbackPath)) {
        screenshotPath = path.relative(process.cwd(), fallbackPath).replace(/\\/g, '/');
      }
    }

    // AI Failure Diagnosis & Recommendations (Section C & D)
    let aiAnalysis = '';
    if (status === 'Fail' && this.config.aiEnabled) {
      try {
        const failureAnalysis = await analyzeTestFailureWithAI({
          testTitle: test.title,
          endpoint,
          errorMessage: cleanError,
          screenshotPath: screenshotPath ? path.resolve(process.cwd(), screenshotPath) : undefined,
        });

        aiAnalysis = `[Cause]: ${failureAnalysis.probableRootCause} | [Fix]: ${failureAnalysis.suggestedFix} | [Recs]: ${failureAnalysis.recommendedTests.join(', ')}`;
      } catch (err: any) {
        aiAnalysis = `AI diagnostic analysis unavailable: ${err?.message || err}`;
      }
    }

    const record: TestRecord = {
      executionId: this.executionId,
      timestamp: new Date().toISOString(),
      testMode: this.config.mode,
      environment: this.config.targetEnv,
      category,
      testCaseId,
      pageOrEndpoint: endpoint,
      scenario: test.title,
      expectedResult,
      actualResult,
      status,
      durationMs,
      errors: cleanError,
      aiAnalysis,
      screenshotPath: category === 'API' ? 'N/A (API Test)' : (screenshotPath || 'N/A'),
    };

    this.records.push(record);
  }

  async onEnd(result: FullResult) {
    this.writeCsvReport();
    this.writeMarkdownReport(result);
    this.writeJsonReport(result);
    this.printSummaryTable(result);
  }

  /**
   * Generates or appends records to CSV (compatible with Google Sheets File -> Import).
   * Preserves execution history across runs (Section F).
   */
  private writeCsvReport() {
    const csvPath = path.join(this.reportsDir, 'testing-report.csv');
    const headers = [
      'Execution ID',
      'Timestamp',
      'Test Mode',
      'Environment',
      'Category',
      'Test Case ID',
      'Page / Endpoint',
      'Test Scenario',
      'Expected Result',
      'Actual Result',
      'Status',
      'Duration (ms)',
      'Error Details',
      'AI Analysis / Recommendations',
      'Screenshot Path',
    ];

    const escapeCsv = (val: any) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = this.records.map((r) => [
      escapeCsv(r.executionId),
      escapeCsv(r.timestamp),
      escapeCsv(r.testMode),
      escapeCsv(r.environment),
      escapeCsv(r.category),
      escapeCsv(r.testCaseId),
      escapeCsv(r.pageOrEndpoint),
      escapeCsv(r.scenario),
      escapeCsv(r.expectedResult),
      escapeCsv(r.actualResult),
      escapeCsv(r.status),
      escapeCsv(r.durationMs),
      escapeCsv(r.errors),
      escapeCsv(r.aiAnalysis),
      escapeCsv(r.screenshotPath),
    ].join(','));

    let fileContent = '';
    if (!fs.existsSync(csvPath)) {
      fileContent = `${headers.join(',')}\n${rows.join('\n')}\n`;
    } else {
      // Append to preserve execution history
      fileContent = `${rows.join('\n')}\n`;
      fs.appendFileSync(csvPath, fileContent, 'utf-8');
      return;
    }

    fs.writeFileSync(csvPath, fileContent, 'utf-8');
  }

  /**
   * Generates high-level GitHub-flavored Markdown report for human inspection.
   */
  private writeMarkdownReport(result: FullResult) {
    const mdPath = path.join(this.reportsDir, 'TESTING_REPORT.md');
    const total = this.records.length;
    const passed = this.records.filter((r) => r.status === 'Pass').length;
    const failed = this.records.filter((r) => r.status === 'Fail').length;
    const skipped = this.records.filter((r) => r.status === 'Skipped').length;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';
    const totalDuration = ((Date.now() - this.startTime) / 1000).toFixed(1);

    let md = `# 📊 Twenty4 DigiGold - Unified Test Execution Report\n\n`;
    md += `> **Execution ID**: \`${this.executionId}\` | **Generated**: ${new Date().toLocaleString()}\n\n`;

    md += `## 1. Execution Summary\n\n`;
    md += `| Metric | Value |\n`;
    md += `| :--- | :--- |\n`;
    md += `| **Testing Mode** | \`${this.config.mode.toUpperCase()}\` |\n`;
    md += `| **Target Environment** | \`${this.config.targetEnv.toUpperCase()}\` (${this.config.baseURL}) |\n`;
    md += `| **AI Features Enabled** | \`${this.config.aiEnabled}\` (${this.config.geminiModel}) |\n`;
    md += `| **Playwright Automation** | \`${this.config.playwrightEnabled}\` |\n`;
    md += `| **Total Tests Executed** | **${total}** |\n`;
    md += `| **Passed** | 🟢 **${passed}** |\n`;
    md += `| **Failed** | 🔴 **${failed}** |\n`;
    md += `| **Skipped** | ⚪ **${skipped}** |\n`;
    md += `| **Pass Rate** | **${passRate}%** |\n`;
    md += `| **Total Duration** | **${totalDuration}s** |\n`;
    md += `| **Google Sheets Tracking** | [Open Tracking Sheet](${this.config.docUrl || '#'}) |\n\n`;

    md += `## 2. Test Execution Details\n\n`;
    md += `| Category | Case ID | Endpoint / Page | Status | Duration | Screenshot / Evidence |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    for (const r of this.records) {
      const statusBadge = r.status === 'Pass' ? '🟢 Pass' : r.status === 'Skipped' ? '⚪ Skipped' : '🔴 Fail';
      const screenshotCell = r.screenshotPath && r.screenshotPath !== 'N/A' && r.screenshotPath !== 'N/A (API Test)'
        ? `[View Screenshot](${r.screenshotPath})`
        : r.screenshotPath;
      md += `| **${r.category}** | \`${r.testCaseId}\` | \`${r.pageOrEndpoint}\` | ${statusBadge} | ${r.durationMs}ms | ${screenshotCell} |\n`;
    }

    md += `\n## 3. Failed Tests & AI Recommendations\n\n`;
    const failedRecords = this.records.filter((r) => r.status === 'Fail');

    if (failedRecords.length === 0) {
      md += `> 🎉 **All ${total} tests passed successfully! No failure diagnostics required.**\n\n`;
    } else {
      for (const f of failedRecords) {
        md += `### 🔴 ${f.testCaseId}: ${f.scenario}\n`;
        md += `- **Endpoint**: \`${f.pageOrEndpoint}\`\n`;
        md += `- **Expected**: ${f.expectedResult}\n`;
        md += `- **Actual**: ${f.actualResult}\n`;
        if (f.errors) {
          md += `- **Error**: \`${f.errors}\`\n`;
        }
        if (f.aiAnalysis) {
          md += `- **AI Failure Analysis & Recommendations**:\n  > ${f.aiAnalysis}\n`;
        }
        if (f.screenshotPath && f.screenshotPath !== 'N/A') {
          md += `- **Failure Screenshot**: [${f.screenshotPath}](${f.screenshotPath})\n`;
        }
        md += `\n---\n`;
      }
    }

    md += `## 4. Google Sheets Synchronization\n\n`;
    md += `To record these results into the official Google Sheet specified by \`TESTING_DOC_URL\`:\n`;
    md += `1. Open: [${this.config.docUrl || 'Google Sheet'}](${this.config.docUrl || '#'})\n`;
    md += `2. Select **File** > **Import** > **Upload** > Select \`reports/testing-report.csv\`\n`;
    md += `3. Choose **Append to current sheet** (or **Replace current sheet**) to preserve historical execution rows.\n\n`;

    fs.writeFileSync(mdPath, md, 'utf-8');
  }

  private writeJsonReport(result: FullResult) {
    const jsonPath = path.join(this.reportsDir, 'latest-run.json');
    const data = {
      executionId: this.executionId,
      timestamp: new Date().toISOString(),
      config: {
        mode: this.config.mode,
        targetEnv: this.config.targetEnv,
        baseURL: this.config.baseURL,
        aiEnabled: this.config.aiEnabled,
      },
      stats: {
        total: this.records.length,
        passed: this.records.filter((r) => r.status === 'Pass').length,
        failed: this.records.filter((r) => r.status === 'Fail').length,
        duration: Date.now() - this.startTime,
      },
      records: this.records,
    };
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  private printSummaryTable(result: FullResult) {
    const total = this.records.length;
    const passed = this.records.filter((r) => r.status === 'Pass').length;
    const failed = this.records.filter((r) => r.status === 'Fail').length;
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);

    console.log(`\n=============================================================`);
    console.log(`📊 Unified Test Execution Summary (${this.executionId})`);
    console.log(`=============================================================`);
    console.log(` Mode         : ${this.config.mode.toUpperCase()}`);
    console.log(` Environment  : ${this.config.targetEnv.toUpperCase()} (${this.config.baseURL})`);
    console.log(` Total Tests  : ${total}`);
    console.log(` Passed       : 🟢 ${passed}`);
    console.log(` Failed       : 🔴 ${failed}`);
    console.log(` Total Time   : ${duration}s`);
    console.log(` CSV Report   : reports/testing-report.csv`);
    console.log(` Markdown     : reports/TESTING_REPORT.md`);
    if (this.config.docUrl) {
      console.log(` Google Sheet : ${this.config.docUrl}`);
    }
    console.log(`=============================================================\n`);
  }
}
