import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const appDir = join(process.cwd(), 'app');

/** @param {string} dir */
function walk(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...walk(fullPath));
      continue;
    }
    if (entry === 'page.tsx' || entry === 'page.ts') {
      results.push(fullPath);
    }
  }
  return results;
}

const pageFiles = walk(appDir);

const violations = [];

for (const file of pageFiles) {
  const source = readFileSync(file, 'utf8');

  const hasSearchParamsRecord = /searchParams\??\s*:\s*Record<\s*string\s*,/m.test(source);
  const hasParamsObject = /params\??\s*:\s*\{[^}]*\}/m.test(source);

  if (hasSearchParamsRecord) {
    violations.push({
      file,
      reason: 'searchParams is typed as plain Record. In Next.js 15 page props, use Promise<...> and await it.',
    });
  }

  if (hasParamsObject && /export\s+default\s+async\s+function/m.test(source)) {
    violations.push({
      file,
      reason: 'params appears to be typed as plain object in async page. In Next.js 15 page props, use Promise<...> and await it.',
    });
  }
}

if (violations.length > 0) {
  console.error('\n[check-next-page-props] Found Next.js 15 page prop typing issues:\n');
  for (const v of violations) {
    console.error(`- ${v.file}: ${v.reason}`);
  }
  console.error('\nPlease update the page prop types to Promise-based values to avoid CI build failures.');
  process.exit(1);
}

console.log(`[check-next-page-props] OK - scanned ${pageFiles.length} page files, no Promise typing regressions found.`);
