import { execSync } from 'node:child_process';

const TARGETS = ['app/admin', 'app/api/admin', 'components/admin', 'lib/admin.guard.ts'];
const CRITICAL_KEYWORDS = /(payment|settlement|정산|status|상태|refund|cancel|취소|shipping|배송|deposit|operations?)/i;

function run(command) {
  return execSync(command, { encoding: 'utf8' }).trim();
}

function classify(file, lineText = '') {
  const isApi = file.startsWith('app/api/admin/');
  const isCriticalPath = /app\/api\/admin\/(operations|dashboard\/metrics|settlements?|payments?)/.test(file);
  if (isApi && (isCriticalPath || CRITICAL_KEYWORDS.test(lineText))) return 'P0';
  if (isApi) return 'P1';
  return 'P2';
}

function collectAnyMatches() {
  try {
    const out = run(`rg -n --json "\\bany\\b" ${TARGETS.join(' ')}`);
    const lines = out.split('\n').filter(Boolean);
    const matches = [];
    for (const line of lines) {
      const row = JSON.parse(line);
      if (row.type !== 'match') continue;
      matches.push({
        file: row.data.path.text,
        line: row.data.line_number,
        text: row.data.lines.text.trim(),
      });
    }
    return matches;
  } catch {
    return [];
  }
}

const matches = collectAnyMatches();
const byFileMap = new Map();
const byPriority = { P0: 0, P1: 0, P2: 0 };

for (const match of matches) {
  const priority = classify(match.file, match.text);
  byPriority[priority] += 1;

  const key = `${match.file}:${priority}`;
  const prev = byFileMap.get(key) ?? { file: match.file, priority, count: 0, lines: [] };
  prev.count += 1;
  prev.lines.push(match.line);
  byFileMap.set(key, prev);
}

const byFile = Array.from(byFileMap.values()).sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));

const report = {
  generatedAt: new Date().toISOString(),
  scope: TARGETS,
  totals: {
    all: matches.length,
    p0Critical: byPriority.P0,
    p1Api: byPriority.P1,
    p2Ui: byPriority.P2,
  },
  byPriority,
  byFile,
};

console.log(JSON.stringify(report, null, 2));
