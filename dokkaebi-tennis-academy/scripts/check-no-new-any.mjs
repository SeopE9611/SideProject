import { execSync } from 'node:child_process';

const TARGET_PREFIXES = ['app/api/boards/', 'app/api/community/', 'app/board/'];
const ANY_PATTERN = /\bany\b|as\s+any/;

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function hasRef(ref) {
  try {
    run(`git rev-parse --verify --quiet ${ref}`);
    return true;
  } catch {
    return false;
  }
}

function resolveBaseRef() {
  const candidates = ['origin/main', 'origin/master', 'main', 'master'];
  for (const candidate of candidates) {
    if (!hasRef(candidate)) continue;
    try {
      const base = run(`git merge-base HEAD ${candidate}`);
      if (base) return base;
    } catch {
      // ignore and try next candidate
    }
  }

  try {
    return run('git rev-parse HEAD~1');
  } catch {
    return run('git rev-parse HEAD');
  }
}

const baseRef = resolveBaseRef();
const diff = run(`git diff --unified=0 ${baseRef}...HEAD -- ${TARGET_PREFIXES.join(' ')}`);

const violations = [];
let currentFile = '';

for (const line of diff.split('\n')) {
  if (line.startsWith('+++ b/')) {
    currentFile = line.slice(6);
    continue;
  }

  if (!line.startsWith('+') || line.startsWith('+++')) continue;
  if (!TARGET_PREFIXES.some((prefix) => currentFile.startsWith(prefix))) continue;

  const codeLine = line.slice(1);
  if (!ANY_PATTERN.test(codeLine)) continue;

  violations.push({ file: currentFile, codeLine });
}

if (violations.length > 0) {
  console.error('[no-new-any-gate] FAIL: 새로 추가된 코드에서 any 사용이 발견되었습니다.');
  violations.forEach(({ file, codeLine }) => {
    console.error(`- ${file}: ${codeLine}`);
  });
  process.exit(1);
}

console.log('[no-new-any-gate] PASS');
console.log(`baseRef=${baseRef}`);
console.log(`scope=${TARGET_PREFIXES.join(', ')}`);
