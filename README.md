# Twenty4 DigiGold - AI & Playwright Testing Framework

A production-grade automated testing system built with **Playwright**, **TypeScript**, and **Gemini AI** for testing the [Twenty4 DigiGold](file:///d:/Projects/JOVI/twenty4_digigold) platform across local and live environments.

---

## 🎯 1. Testing Modes Overview

The framework supports three test execution modes selectable via the `.env.local` file without modifying test implementations:

| Mode | Variable | Description | Source of Truth |
| :--- | :--- | :--- | :--- |
| **Playwright Mode** | `TEST_MODE=playwright` | Deterministic browser automation for UI workflows, form inputs, and backend API contracts. | Playwright Assertions |
| **AI Testing Mode** | `TEST_MODE=ai` | AI-assisted testing that explores pages, discovers interactive UI elements, generates candidate test scenarios (positive, negative, boundary), and provides root-cause failure explanations. | Playwright Verified DOM / AI |
| **Hybrid Mode** | `TEST_MODE=hybrid` | Combines deterministic Playwright browser execution with Gemini AI-assisted page discovery, cross-validation, and failure diagnostics. | Playwright Assertions |

---

## ⚙️ 2. Configuration (`.env.local`)

Copy `.env.example` to `.env.local` and set your configuration:

```env
# ==============================================================================
# Testing Mode Configuration
# Supported TEST_MODE: 'playwright' | 'ai' | 'hybrid'
# ==============================================================================
TEST_MODE=playwright
AI_TESTING_ENABLED=false
PLAYWRIGHT_ENABLED=true

# ==============================================================================
# Environment Configuration (live / local)
# ==============================================================================
TARGET_ENV=live
PRODUCTION_URL=https://digigold.twenty4.in/digigold
LOCAL_URL=http://localhost:3000/digigold

# Google Sheets Tracking Document
TESTING_DOC_URL=https://docs.google.com/spreadsheets/d/1WuI4b4okQxQaplg5nzg53uUldteyszUveon0nsrvYr8/edit?usp=sharing

# ==============================================================================
# AI Provider Configuration (Google Gemini)
# ==============================================================================
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# ==============================================================================
# Credentials for Authenticated Tests (Admin & Customer)
# ==============================================================================
ADMIN_USERNAME=admin@digigold.in
ADMIN_PASSWORD=your_admin_password
CUSTOMER_MOBILE=9876543210
CUSTOMER_OTP=123456
```

> **Startup Validation**: The framework validates `TEST_MODE` at startup. If an invalid or unsupported mode is specified, execution halts immediately with a clear error listing all valid modes.

---

## 🚀 3. Execution Commands

Use the following CLI commands to run tests across modes, environments, and categories:

```bash
# Run Playwright deterministic mode (UI + API)
npm run test:playwright

# Run AI-assisted testing mode (Discovery, scenario generation & failure diagnosis)
npm run test:ai

# Run Hybrid mode (Playwright execution + AI discovery & analysis)
npm run test:hybrid

# Target Local environment (http://localhost:3000/digigold)
npm run test:local

# Target Live production environment (https://digigold.twenty4.in/digigold)
npm run test:live

# Run Backend API tests only
npm run test:api

# Run Storefront UI tests only
npm run test:ui

# Open interactive Playwright UI runner
npm run test:interactive

# View Playwright HTML report
npm run test:report

# Clear previous test reports, screenshots, and test results
npm run clean:reports
```

---

## 🧪 4. Mode Details

### A. Playwright Testing Mode (`TEST_MODE=playwright`)
- Automates browser interactions: opening pages, navigating routes, clicking buttons, submitting forms.
- Validates live rates ticker, digital gold vault, schemes, catalogues, customer login, and admin console.
- Uses stable Playwright locators (`getByRole`, explicit selectors) and built-in auto-waiting (`domcontentloaded`).
- Captures checkpoint screenshots on crucial pages and failures (`screenshots/ui/`).
- Runs headless by default; supports headed execution (`npm run test:headed`).

### B. AI Testing Mode (`TEST_MODE=ai`)
- **Page & Element Discovery**: Scans DOM nodes to detect interactive buttons, inputs, navigation links, and content hierarchies.
- **Candidate Scenario Generation**: Suggests 3 candidate scenarios per page: Positive (happy path), Negative (invalid inputs/empty forms), and Boundary (mobile responsive, edge cases).
- **Failure Diagnostics**: Analyzes failed tests using Gemini to generate human-readable summaries, probable root causes, recommended fixes, and regression test ideas.
- **Resilient Fallback**: If Gemini API credentials or connectivity are unavailable or slow, provides deterministic heuristic fallback scenarios so tests never stall or crash.

### C. Hybrid Testing Mode (`TEST_MODE=hybrid`)
Follows the structured 7-step process:
1. Playwright opens the target application (`live` or `local`).
2. Discovers pages and interactive elements using DOM inspection.
3. Uses AI to analyze the page structure and propose candidate scenarios.
4. Validates scenarios against security policies and executes them through Playwright.
5. Captures checkpoint screenshots and collects execution logs.
6. Records actual results into `reports/testing-report.csv` for Google Sheets synchronization.
7. Uses AI to summarize any test failures and recommend follow-up tests.
*Playwright remains responsible for assertions and actual results—AI never fabricates passes.*

### D. API Testing
- Verifies metal rates (`GET /api/rates/current`, `GET /api/mobile/rates`), app settings (`GET /api/mobile/v1/app-settings`), auth guards (`GET /api/users`), credential rejection (`POST /api/auth/login`), and OTP validation (`POST /api/store/auth/send-otp`).
- Validates HTTP status codes, JSON schema keys, and response times (< 3500ms).
- Records request and response evidence payloads in test reports.
- **No meaningless browser screenshots** are created for API-only tests.

---

## 📊 5. Reporting and Google Sheets Integration

Regardless of the selected mode, all tests feed into the **Unified Reporter**:

1. **CSV Report (`reports/testing-report.csv`)**:
   - Preserves historical test execution rows across runs.
   - Standardized columns:
     - `Execution ID`
     - `Timestamp`
     - `Test Mode`
     - `Environment`
     - `Category`
     - `Test Case ID`
     - `Page / Endpoint`
     - `Test Scenario`
     - `Expected Result`
     - `Actual Result`
     - `Status` (`Pass` / `Fail` / `Skipped`)
     - `Duration (ms)`
     - `Error Details`
     - `AI Analysis / Recommendations`
     - `Screenshot Path`
2. **Markdown Summary (`reports/TESTING_REPORT.md`)**:
   - Clean GitHub-flavored Markdown report with pass rates, metrics, execution details, and AI diagnostics.
3. **Google Sheets Sync**:
   - Open your tracking sheet: [`TESTING_DOC_URL`]
   - Click **File** > **Import** > **Upload** > Select `reports/testing-report.csv`
   - Choose **Append to current sheet** to record new execution batches.

---

## 🛡️ 6. Safety & Security Policies

- **Credential Sanitization**: The `sanitizeForAI` utility automatically strips passwords, secrets, tokens, OTPs, phone numbers, and API keys before sending any prompt to AI models.
- **Non-Destructive Enforcement**: AI-generated tests are validated before execution; any scenario attempting destructive keywords (`delete`, `drop`, `wipe`, `truncate`) is automatically converted into a safe read-only guard test.
- **Deterministic Truth**: Playwright assertions remain the source of truth. AI never marks a test as passed without verified assertion evidence.
- **Capability Breakdown**:
  - Works 100% without AI Key: Playwright UI tests, API tests, auth flows, screenshot captures, CSV reporting, Google Sheets export.
  - Requires AI Key (`GEMINI_API_KEY`): AI dynamic scenario generation, visual quality analysis, automated root-cause failure explanations.
