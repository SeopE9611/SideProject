import { execSync } from 'node:child_process';

function run(command) {
  return execSync(command, { encoding: 'utf8' }).trim();
}

function countAny(target) {
  try {
    const out = run(`rg -n "\\bany\\b" ${target}`);
    if (!out) return 0;
    return out.split('\n').filter(Boolean).length;
  } catch {
    return 0;
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  metrics: {
    adminAnyCount: countAny('app/admin app/api/admin components/admin'),
  },
};

console.log(JSON.stringify(report, null, 2));
