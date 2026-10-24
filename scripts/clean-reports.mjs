import fs from 'fs';
import path from 'path';

const TARGET_DIRS = [
  'reports',
  'screenshots',
  'playwright-report',
  'test-results',
];

console.log('\n🧹 Cleaning testing reports, screenshots, and test results...\n');

let cleanedCount = 0;

for (const dirName of TARGET_DIRS) {
  const fullPath = path.resolve(process.cwd(), dirName);
  if (fs.existsSync(fullPath)) {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`  ✓ Removed: ${dirName}/`);
      cleanedCount++;
    } catch (err) {
      console.error(`  ✗ Failed to remove ${dirName}/:`, err.message);
    }
  } else {
    console.log(`  - Skipped: ${dirName}/ (already clean)`);
  }
}

// Re-create empty placeholder directories for next test runs
fs.mkdirSync(path.resolve(process.cwd(), 'reports'), { recursive: true });
fs.mkdirSync(path.resolve(process.cwd(), 'screenshots'), { recursive: true });

console.log(`\n✨ Testing reports and screenshots cleared successfully! (${cleanedCount} cleaned)\n`);
