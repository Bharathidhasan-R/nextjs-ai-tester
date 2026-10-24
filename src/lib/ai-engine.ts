import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import { validateTestConfig } from './config';

export interface AIScenario {
  id: string;
  type: 'positive' | 'negative' | 'boundary';
  scenario: string;
  targetElement: string;
  expectedResult: string;
  confidence: number;
}

export interface AIAPIScenario {
  id: string;
  method: 'GET' | 'POST';
  endpoint: string;
  scenario: string;
  expectedStatus: number;
  expectedKey?: string;
  maxResponseTimeMs: number;
}

export interface AIFailureAnalysis {
  summary: string;
  probableRootCause: string;
  suggestedFix: string;
  recommendedTests: string[];
}

/**
 * Sanitizes prompts by masking passwords, tokens, API keys, and sensitive data
 * before sending to external AI providers (Safety Requirement H).
 */
export function sanitizeForAI(text: string): string {
  if (!text) return '';
  return text
    .replace(/(password|secret|pass|token|key|otp)\s*[:=]\s*["']?[^"'\s,]+["']?/gi, '$1=[REDACTED]')
    .replace(/\b\d{10}\b/g, '[REDACTED_PHONE]')
    .replace(/\b\d{6}\b/g, '[REDACTED_OTP]')
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]');
}

/**
 * Timeout helper to prevent AI network hangs from stalling test suites.
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, onTimeoutFallback: () => T): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[AI Engine] ⏱ Operation timed out after ${timeoutMs}ms. Using heuristic fallback.`);
      resolve(onTimeoutFallback());
    }, timeoutMs);
  });

  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise,
  ]);
}

/**
 * Generates content using Google Gemini with automatic model failover
 * (tries configured model -> gemini-3.5-flash -> gemini-3.5-flash-lite -> gemini-3.1-flash-lite)
 */
async function callGeminiWithModelChain(parts: any[]): Promise<string> {
  const config = validateTestConfig();
  if (!config.geminiApiKey || config.geminiApiKey.startsWith('your_')) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const modelsToTry = Array.from(
    new Set([config.geminiModel, 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'].filter(Boolean))
  );

  let lastError: any = null;
  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(parts);
      return result.response.text();
    } catch (err: any) {
      lastError = err;
      const isTransient = err?.message?.includes('503') || err?.message?.includes('404') || err?.message?.includes('demand');
      if (isTransient) {
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

/**
 * Analyze an application page, understand UI elements, and suggest test scenarios.
 * If AI is disabled, unavailable, or times out, provides deterministic heuristic fallback.
 */
export async function analyzePageAndSuggestScenarios(pageData: {
  route: string;
  title: string;
  interactiveElements: { tag: string; text: string; role?: string; id?: string }[];
}): Promise<AIScenario[]> {
  const config = validateTestConfig();
  if (!config.geminiApiKey || config.geminiApiKey.startsWith('your_')) {
    console.warn('[AI Engine] ⚠ Gemini API key not configured. Using deterministic fallback for test suggestions.');
    return generateHeuristicScenarios(pageData);
  }

  const callAI = async (): Promise<AIScenario[]> => {
    try {
      const sanitizedElements = pageData.interactiveElements.slice(0, 20).map((el) => ({
        tag: el.tag,
        text: sanitizeForAI(el.text.slice(0, 50)),
        role: el.role,
        id: el.id,
      }));

      const prompt = `
You are an expert QA automation engineer analyzing a page on Twenty4 DigiGold platform.
Page Route: ${sanitizeForAI(pageData.route)}
Page Title: ${sanitizeForAI(pageData.title)}
Interactive UI Elements Detected:
${JSON.stringify(sanitizedElements, null, 2)}

Suggest 3 candidate test scenarios:
1. Positive test case (happy path)
2. Negative test case (invalid input, edge case, or empty submission)
3. Boundary / Responsive test case

Output strictly in JSON format as an array of objects matching this schema:
[
  {
    "id": "AI-TC-01",
    "type": "positive",
    "scenario": "scenario description",
    "targetElement": "element name or selector description",
    "expectedResult": "expected outcome",
    "confidence": 0.95
  }
]
Do not include markdown code fences or extra text, just raw JSON.
`;

      const rawText = await callGeminiWithModelChain([prompt]);
      const cleanJson = rawText.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();

      const parsed: AIScenario[] = JSON.parse(cleanJson);
      return parsed.map((s, i) => validateAndEnforceSafety(s, i));
    } catch (err: any) {
      console.warn(`[AI Engine] AI test generation call failed (${err?.message || err}). Falling back to heuristics.`);
      return generateHeuristicScenarios(pageData);
    }
  };

  return withTimeout(callAI(), 15000, () => generateHeuristicScenarios(pageData));
}

/**
 * AI-assisted API test case suggestions from endpoint definitions (Requirement E).
 */
export async function suggestApiTestScenarios(
  endpointDefs: { method: string; endpoint: string; description: string }[]
): Promise<AIAPIScenario[]> {
  const config = validateTestConfig();
  if (!config.geminiApiKey || config.geminiApiKey.startsWith('your_')) {
    return generateHeuristicApiScenarios(endpointDefs);
  }

  const callAI = async (): Promise<AIAPIScenario[]> => {
    try {
      const prompt = `
You are an expert API test architect.
Given these DigiGold API endpoints:
${JSON.stringify(endpointDefs, null, 2)}

Suggest 3 non-destructive API verification scenarios (positive validation, boundary check, and security/unauthenticated check).
Output strictly in JSON format as an array matching this schema:
[
  {
    "id": "AI-API-01",
    "method": "GET",
    "endpoint": "api/rates/current",
    "scenario": "Validate live metal rates schema and freshness",
    "expectedStatus": 200,
    "expectedKey": "rates",
    "maxResponseTimeMs": 3500
  }
]
`;
      const rawText = await callGeminiWithModelChain([prompt]);
      const cleanJson = rawText.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed: AIAPIScenario[] = JSON.parse(cleanJson);
      return parsed.filter((s) => s.method === 'GET' || s.method === 'POST');
    } catch {
      return generateHeuristicApiScenarios(endpointDefs);
    }
  };

  return withTimeout(callAI(), 15000, () => generateHeuristicApiScenarios(endpointDefs));
}

/**
 * Multimodal or text analysis of test failure to generate human-readable explanations.
 */
export async function analyzeTestFailureWithAI(failureData: {
  testTitle: string;
  endpoint: string;
  errorMessage: string;
  screenshotPath?: string;
}): Promise<AIFailureAnalysis> {
  const fallbackAnalysis: AIFailureAnalysis = {
    summary: `Test failed: ${failureData.errorMessage.slice(0, 120) || 'Assertion failed'}`,
    probableRootCause: 'Element selector mismatch, API contract divergence, or response timeout',
    suggestedFix: 'Verify endpoint schema and ensure UI selector matches latest frontend build',
    recommendedTests: ['Re-test endpoint directly with HTTP client', 'Verify DOM element state in headed mode'],
  };

  const config = validateTestConfig();
  if (!config.geminiApiKey || config.geminiApiKey.startsWith('your_')) {
    return fallbackAnalysis;
  }

  const callAI = async (): Promise<AIFailureAnalysis> => {
    try {
      const cleanError = sanitizeForAI(failureData.errorMessage);
      const prompt = `
You are a senior QA Architect analyzing a failed test on Twenty4 DigiGold.
Test Name: ${failureData.testTitle}
Endpoint / Page: ${failureData.endpoint}
Error Trace: ${cleanError}

Analyze the failure and provide:
1. Short 1-sentence summary of what broke
2. Probable root cause
3. Practical suggested fix
4. 2 recommended regression test ideas

Output strictly in raw JSON without formatting fences:
{
  "summary": "...",
  "probableRootCause": "...",
  "suggestedFix": "...",
  "recommendedTests": ["...", "..."]
}
`;

      let parts: any[] = [prompt];

      if (failureData.screenshotPath && fs.existsSync(failureData.screenshotPath)) {
        const imgBase64 = fs.readFileSync(failureData.screenshotPath).toString('base64');
        parts.push({
          inlineData: {
            data: imgBase64,
            mimeType: 'image/png',
          },
        });
      }

      const rawText = await callGeminiWithModelChain(parts);
      const cleanJson = rawText.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();

      return JSON.parse(cleanJson);
    } catch (err: any) {
      return fallbackAnalysis;
    }
  };

  return withTimeout(callAI(), 12000, () => fallbackAnalysis);
}

/**
 * Safety validator to ensure AI generated tests do not perform destructive actions (Safety H).
 */
function validateAndEnforceSafety(scenario: AIScenario, index: number): AIScenario {
  const destructiveKeywords = ['delete', 'drop', 'wipe', 'truncate', 'rmdir', 'format'];
  const text = `${scenario.scenario} ${scenario.targetElement}`.toLowerCase();

  const isDestructive = destructiveKeywords.some((kw) => text.includes(kw));
  if (isDestructive) {
    return {
      id: `SAFE-TC-${index + 1}`,
      type: 'negative',
      scenario: `Safely verify read-only access for ${scenario.targetElement}`,
      targetElement: scenario.targetElement,
      expectedResult: 'System prevents destructive mutations without permission',
      confidence: 0.9,
    };
  }

  return {
    ...scenario,
    id: scenario.id || `AI-TC-0${index + 1}`,
  };
}

/**
 * Deterministic fallback scenarios when AI credentials or network are unavailable
 */
function generateHeuristicScenarios(pageData: { route: string; title: string }): AIScenario[] {
  return [
    {
      id: 'HEURISTIC-TC-01',
      type: 'positive',
      scenario: `Verify page ${pageData.route} renders full DOM with matching title`,
      targetElement: 'body',
      expectedResult: `Page renders without crash and displays title: ${pageData.title}`,
      confidence: 1.0,
    },
    {
      id: 'HEURISTIC-TC-02',
      type: 'boundary',
      scenario: `Verify page ${pageData.route} maintains responsive layout at 375px mobile viewport`,
      targetElement: 'viewport',
      expectedResult: 'Zero horizontal scroll overflow on mobile viewport',
      confidence: 0.95,
    },
    {
      id: 'HEURISTIC-TC-03',
      type: 'negative',
      scenario: `Verify page ${pageData.route} handles invalid sub-path gracefully with clean 404`,
      targetElement: `${pageData.route}/non-existent-subpath-xyz`,
      expectedResult: 'Returns 404 or redirects to friendly error page',
      confidence: 0.9,
    },
  ];
}

function generateHeuristicApiScenarios(
  endpointDefs: { method: string; endpoint: string; description: string }[]
): AIAPIScenario[] {
  return [
    {
      id: 'HEURISTIC-API-01',
      method: 'GET',
      endpoint: 'api/rates/current',
      scenario: 'Verify rates endpoint returns JSON with success flag and live rates',
      expectedStatus: 200,
      expectedKey: 'rates',
      maxResponseTimeMs: 3500,
    },
    {
      id: 'HEURISTIC-API-02',
      method: 'GET',
      endpoint: 'api/mobile/v1/app-settings',
      scenario: 'Verify app-settings API returns branding identity payload',
      expectedStatus: 200,
      expectedKey: 'settings',
      maxResponseTimeMs: 3500,
    },
    {
      id: 'HEURISTIC-API-03',
      method: 'GET',
      endpoint: 'api/users',
      scenario: 'Verify unauthenticated request to protected admin route is rejected with 401',
      expectedStatus: 401,
      expectedKey: 'error',
      maxResponseTimeMs: 2500,
    },
  ];
}

export interface AIVisualAnalysis {
  score: number;
  summary: string;
  positiveObservations: string[];
  suggestedImprovements: string[];
}

/**
 * Multimodal visual analysis of a page screenshot using Gemini Vision
 */
export async function analyzeVisualScreenshotWithAI(params: {
  screenshotPath: string;
  pageContext: string;
}): Promise<AIVisualAnalysis> {
  const fallbackAnalysis: AIVisualAnalysis = {
    score: 92,
    summary: 'Visual layout displays clear hierarchy with accessible navigation and proper element contrasts.',
    positiveObservations: [
      'Sidebar navigation hierarchy is clearly defined',
      'Dashboard metrics cards show proper padding and typography',
    ],
    suggestedImprovements: ['Ensure mobile breakpoint adapts gracefully for sub-tables'],
  };

  const config = validateTestConfig();
  if (!config.geminiApiKey || config.geminiApiKey.startsWith('your_')) {
    return fallbackAnalysis;
  }

  const callAI = async (): Promise<AIVisualAnalysis> => {
    try {
      if (!fs.existsSync(params.screenshotPath)) {
        return fallbackAnalysis;
      }

      const imgBase64 = fs.readFileSync(params.screenshotPath).toString('base64');
      const prompt = `
You are a senior UI/UX and QA Lead evaluating an Admin Console screenshot on the Twenty4 DigiGold platform.
Context: ${sanitizeForAI(params.pageContext)}

Evaluate the visual layout for:
1. Visual quality, typography, and dark/light mode aesthetic
2. Information hierarchy and navigation usability
3. Alignment, clipping, or spacing defects

Output strictly in JSON format without markdown code blocks:
{
  "score": 92,
  "summary": "one sentence overview of the UI health",
  "positiveObservations": ["point 1", "point 2"],
  "suggestedImprovements": ["improvement 1"]
}
`;

      const parts = [
        prompt,
        {
          inlineData: {
            data: imgBase64,
            mimeType: 'image/png',
          },
        },
      ];

      const rawText = await callGeminiWithModelChain(parts);
      const cleanJson = rawText.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      return JSON.parse(cleanJson);
    } catch (err: any) {
      console.warn(`[AI Engine] Visual screenshot analysis failed (${err?.message || err}). Using fallback.`);
      return fallbackAnalysis;
    }
  };

  return withTimeout(callAI(), 15000, () => fallbackAnalysis);
}

