import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

export async function analyzeScreenshotWithGemini(
  screenshotPath: string,
  customPrompt?: string
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('your_')) {
    console.warn('[Gemini Visual Analysis] GEMINI_API_KEY is not set or using placeholder.');
    return 'Status: SKIPPED\nIssues:\n- GEMINI_API_KEY is not configured in .env.local\nSuggestions:\n- Add a valid GEMINI_API_KEY to run AI visual analysis';
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Google Generative AI API supported model IDs: gemini-2.5-flash, gemini-1.5-flash, gemini-2.0-flash
    const targetModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
    let model = genAI.getGenerativeModel({ model: targetModel });

    if (!fs.existsSync(screenshotPath)) {
      throw new Error(`Screenshot file not found at: ${screenshotPath}`);
    }


    const imageData = fs.readFileSync(screenshotPath).toString('base64');

    const defaultPrompt = `
You are a senior UI/UX QA engineer testing Twenty4 DigiGold (a premium digital gold & jewellery platform).
Analyze this screenshot of the live website.

Check for:
- Layout / spacing issues
- Overlapping elements
- Low contrast text
- Broken images or icons
- Responsive problems
- Overall visual quality and branding consistency

Reply in this exact format:

Status: PASS or FAIL
Issues:
- issue 1 (or "None")
- issue 2
Suggestions:
- suggestion 1 (or "None")
`;

    const result = await model.generateContent([
      customPrompt || defaultPrompt,
      {
        inlineData: {
          data: imageData,
          mimeType: 'image/png',
        },
      },
    ]);

    return result.response.text();
  } catch (err: any) {
    console.error('[Gemini Visual Analysis Error]:', err?.message || err);
    return `Status: ERROR\nIssues:\n- Gemini API call failed: ${err?.message || err}\nSuggestions:\n- Verify GEMINI_API_KEY quota and model access`;
  }
}
