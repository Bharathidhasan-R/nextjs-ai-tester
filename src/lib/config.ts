import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local first, then fallback to .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export type TestMode = 'playwright' | 'ai' | 'hybrid';
export type TargetEnvironment = 'live' | 'local';

export interface TestConfig {
  mode: TestMode;
  aiEnabled: boolean;
  playwrightEnabled: boolean;
  targetEnv: TargetEnvironment;
  baseURL: string;
  geminiApiKey: string;
  geminiModel: string;
  docUrl: string;
  adminUser: string;
  adminPass: string;
  customerMobile: string;
  customerOtp: string;
}

const SUPPORTED_MODES: TestMode[] = ['playwright', 'ai', 'hybrid'];

let cachedConfig: TestConfig | null = null;

export function validateTestConfig(): TestConfig {
  if (cachedConfig) return cachedConfig;

  const rawMode = (process.env.TEST_MODE || 'playwright').trim().toLowerCase();

  if (!SUPPORTED_MODES.includes(rawMode as TestMode)) {
    const errorMsg = `\n❌ [Configuration Error]: Unsupported TEST_MODE "${process.env.TEST_MODE}".\n` +
      `   Supported modes are: ${SUPPORTED_MODES.map((m) => `'${m}'`).join(', ')}\n` +
      `   Please update TEST_MODE in your .env.local file or CLI environment.\n`;
    console.error(errorMsg);
    throw new Error(`Unsupported TEST_MODE: "${process.env.TEST_MODE}". Must be one of: ${SUPPORTED_MODES.join(', ')}`);
  }

  const mode = rawMode as TestMode;

  // Resolve flags based on mode, allowing explicit override if configured
  const aiEnabled = process.env.AI_TESTING_ENABLED !== undefined
    ? process.env.AI_TESTING_ENABLED === 'true'
    : mode === 'ai' || mode === 'hybrid';

  const playwrightEnabled = process.env.PLAYWRIGHT_ENABLED !== undefined
    ? process.env.PLAYWRIGHT_ENABLED === 'true'
    : mode === 'playwright' || mode === 'hybrid';

  // Environment resolution
  const targetEnv: TargetEnvironment = (process.env.TARGET_ENV?.toLowerCase() === 'local') ? 'local' : 'live';

  const rawUrl = targetEnv === 'local'
    ? (process.env.LOCAL_URL || 'http://localhost:3000/digigold')
    : (process.env.PRODUCTION_URL || 'https://digigold.twenty4.in/digigold');

  const baseURL = rawUrl.endsWith('/') ? rawUrl : `${rawUrl}/`;

  cachedConfig = {
    mode,
    aiEnabled,
    playwrightEnabled,
    targetEnv,
    baseURL,
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
    docUrl: process.env.TESTING_DOC_URL || '',
    adminUser: process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL || 'admin@digigold.in',
    adminPass: process.env.ADMIN_PASSWORD || 'Admin@12345',
    customerMobile: process.env.CUSTOMER_MOBILE || '9876543210',
    customerOtp: process.env.CUSTOMER_OTP || '123456',
  };

  printConfigBanner(cachedConfig);
  return cachedConfig;
}

function printConfigBanner(config: TestConfig) {
  const isCi = !!process.env.CI;
  if (isCi) return;

  const modeBadge = config.mode === 'hybrid'
    ? '🟣 HYBRID MODE (Playwright + Gemini AI)'
    : config.mode === 'ai'
    ? '🔮 AI-ASSISTED TESTING MODE'
    : '⚡ PLAYWRIGHT AUTOMATION MODE';

  console.log(`\n┌─────────────────────────────────────────────────────────────┐`);
  console.log(`│ ${modeBadge.padEnd(59)} │`);
  console.log(`├─────────────────────────────────────────────────────────────┤`);
  console.log(`│ Target Env    : ${config.targetEnv.toUpperCase().padEnd(43)} │`);
  console.log(`│ Target URL    : ${config.baseURL.slice(0, 43).padEnd(43)} │`);
  console.log(`│ Playwright    : ${String(config.playwrightEnabled).padEnd(43)} │`);
  console.log(`│ AI Enabled    : ${String(config.aiEnabled).padEnd(43)} │`);
  console.log(`│ AI Model      : ${config.geminiModel.padEnd(43)} │`);
  console.log(`│ Tracking Doc  : ${(config.docUrl ? 'Configured' : 'None').padEnd(43)} │`);
  console.log(`└─────────────────────────────────────────────────────────────┘\n`);
}
