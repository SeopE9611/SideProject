import { spawnSync } from "node:child_process";
const TARGETS = ["app/admin", "app/api/admin", "components/admin", "lib/admin.guard.ts"];
const CRITICAL_KEYWORDS =
  /(payment|settlement|정산|status|상태|refund|cancel|취소|shipping|배송|deposit|operations?)/i;

function classify(file, lineText = "") {
  const isApi = file.startsWith("app/api/admin/");
  const isCriticalPath =
    /app\/api\/admin\/(operations|dashboard\/metrics|settlements?|payments?)/.test(file);
  if (isApi && (isCriticalPath || CRITICAL_KEYWORDS.test(lineText))) return "P0";
  if (isApi) return "P1";
  return "P2";
}

function collectAnyMatches() {
  const result = spawnSync("rg", ["-n", "--json", "\\bany\\b", ...TARGETS], { encoding: "utf8" });

  if (result.error) {
    const message =
      result.error.code === "ENOENT"
        ? "ripgrep(rg)을 찾을 수 없습니다. rg를 설치하고 PATH를 다시 확인하세요."
        : result.error.message;

    throw new Error(`[admin-any-report] ${message}`);
  }

  // ripgrep 종료 코드 1은 검색 결과가 없다는 정상 상태입니다.
  if (result.status === 1) return [];

  if (result.status !== 0) {
    const stderr = String(result.stderr ?? "").trim();

    throw new Error(`[admin-any-report] rg 실행 실패 (exit=${result.status}): ${stderr}`);
  }

  const lines = result.stdout.split("\n").filter(Boolean);
  const matches = [];

  for (const line of lines) {
    const row = JSON.parse(line);
    if (row.type !== "match") continue;

    matches.push({
      file: row.data.path.text,
      line: row.data.line_number,
      text: row.data.lines.text.trim(),
    });
  }

  return matches;
}

const matches = collectAnyMatches();
const byFileMap = new Map();
const byPriority = { P0: 0, P1: 0, P2: 0 };

for (const match of matches) {
  const priority = classify(match.file, match.text);
  byPriority[priority] += 1;

  const key = `${match.file}:${priority}`;
  const prev = byFileMap.get(key) ?? {
    file: match.file,
    priority,
    count: 0,
    lines: [],
  };
  prev.count += 1;
  prev.lines.push(match.line);
  byFileMap.set(key, prev);
}

const byFile = Array.from(byFileMap.values()).sort(
  (a, b) => b.count - a.count || a.file.localeCompare(b.file),
);

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
