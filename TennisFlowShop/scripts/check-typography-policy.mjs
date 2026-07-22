#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = ["app", "components"];
const EXTENSIONS = new Set([".ts", ".tsx", ".css"]);
const WEIGHT_CLASSES = /\bfont-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|ui-regular|ui-medium|ui-bold|brand-light|brand-medium|brand-bold|brand-heading|brand-display)\b/g;
const SMALL_UI_TEXT = /\btext-(?:ui-(?:micro|caption|label|body(?:-sm|-lg)?|card-title(?:-lg)?|section-title)|\[(?:[0-9]|1[0-9]|20)px\])/;
const BRAND_CLASS = /\bfont-brand-(?:light|medium|bold|heading|display)\b/;
const NEGATIVE_TRACKING = /\btracking-\[-(?:0(?:\.\d+)?|\.\d+)em\]/;
const DIRECT_600 = /(?:font-weight\s*:\s*["']?600\b|fontWeight\s*:\s*["']?600\b)/g;
const BANNED_MODULE_PATTERN = /\.(?:marketingTitle|brandTitle)\s*\{[^}]*?(?:GmarketSans|--home-brand-font-family)[^}]*?\}/gs;

function walk(dir, result = [], root = ROOT) {
  const absDir = path.join(root, dir);
  if (!fs.existsSync(absDir)) return result;
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, result, root);
    else if (EXTENSIONS.has(path.extname(entry.name))) result.push(rel.replaceAll("\\", "/"));
  }
  return result;
}

function lineAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function readBraceExpression(source, start) {
  let depth = 0;
  let quote = null;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === "\\") index += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (["'", '"', "`"].includes(character)) quote = character;
    else if (character === "{") depth += 1;
    else if (character === "}" && --depth === 0) return source.slice(start + 1, index);
  }
  return null;
}

function findClassGroups(source) {
  const groups = [];
  const attribute = /(?:className|class)\s*=\s*/g;
  for (const match of source.matchAll(attribute)) {
    const start = (match.index ?? 0) + match[0].length;
    const first = source[start];
    if (["'", '"'].includes(first)) {
      const end = source.indexOf(first, start + 1);
      if (end !== -1) groups.push({ text: source.slice(start + 1, end), index: match.index ?? 0 });
    } else if (first === "{") {
      const expression = readBraceExpression(source, start);
      if (expression !== null) {
        const strings = [...expression.matchAll(/["'`]([^"'`]*)["'`]/g)].map((item) => item[1]);
        // 삼항식의 두 분기는 동시에 적용되지 않으므로 각 분기를 별도 class 그룹으로 검사한다.
        if (expression.includes("?")) {
          for (const text of strings) groups.push({ text, index: match.index ?? 0 });
        } else {
          groups.push({ text: strings.join(" "), index: match.index ?? 0 });
        }
      }
    }
  }
  return groups;
}

function isHeaderServiceWordmark(file, source, group) {
  if (file !== "components/header.tsx" || !/\bfont-brand-/.test(group.text)) return false;
  const element = source.slice(group.index, source.indexOf(">", group.index) + 1);
  // 실제 header 서비스 wordmark만 작은 브랜드 폰트 예외로 유지한다.
  return element.includes("font-brand-bold") && source.slice(group.index, group.index + 300).includes("도깨비테니스");
}

function collectViolations(files, root = ROOT) {
  const violations = [];
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    for (const match of source.matchAll(DIRECT_600)) {
      violations.push({ file, line: lineAt(source, match.index ?? 0), rule: "unsupported-600", token: match[0] });
    }
    if (file.endsWith(".css")) {
      for (const match of source.matchAll(BANNED_MODULE_PATTERN)) {
        violations.push({ file, line: lineAt(source, match.index ?? 0), rule: "small-brand-css-module", token: match[0].split("\n")[0] });
      }
    }
    for (const group of findClassGroups(source)) {
      const weights = [...group.text.matchAll(WEIGHT_CLASSES)].map((match) => match[0]);
      const uniqueWeights = [...new Set(weights)];
      if (uniqueWeights.length > 1) {
        violations.push({ file, line: lineAt(source, group.index), rule: "multiple-font-weight-utilities", token: uniqueWeights.join(", ") });
      }
      if (!SMALL_UI_TEXT.test(group.text)) continue;
      if (BRAND_CLASS.test(group.text) && !isHeaderServiceWordmark(file, source, group)) {
        violations.push({ file, line: lineAt(source, group.index), rule: "small-brand-font", token: group.text });
      }
      if (NEGATIVE_TRACKING.test(group.text)) {
        violations.push({ file, line: lineAt(source, group.index), rule: "small-negative-tracking", token: group.text });
      }
    }
  }
  const configPath = path.join(root, "tailwind.config.ts");
  const config = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
  const semibold = /\bsemibold\s*:\s*["'`]([^"'`]+)["'`]/.exec(config);
  if (!semibold) violations.push({ file: "tailwind.config.ts", line: 1, rule: "semibold-500-mapping", token: "semibold 설정 없음" });
  else if (semibold[1] !== "500") violations.push({ file: "tailwind.config.ts", line: lineAt(config, semibold.index), rule: "semibold-500-mapping", token: `semibold: ${semibold[1]}` });
  const extra600 = /\b[\w-]+\s*:\s*["'`]600["'`]/g;
  for (const match of config.matchAll(extra600)) {
    violations.push({ file: "tailwind.config.ts", line: lineAt(config, match.index ?? 0), rule: "unsupported-600-token", token: match[0] });
  }
  return violations;
}

function runSelfTest() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "typography-policy-"));
  try {
    fs.mkdirSync(path.join(fixtureRoot, "app"));
    fs.mkdirSync(path.join(fixtureRoot, "components"));
    const config = 'export default { theme: { extend: { fontWeight: { semibold: "500" } } } };';
    fs.writeFileSync(path.join(fixtureRoot, "tailwind.config.ts"), config);
    fs.writeFileSync(path.join(fixtureRoot, "app", "valid.tsx"), [
      '<p className="font-ui-medium text-ui-body-lg" />',
      '<h1 className="font-ui-bold text-ui-page-title" />',
      '<p className="font-brand-display text-ui-display" />',
    ].join("\n"));
    fs.writeFileSync(path.join(fixtureRoot, "app", "fixture.tsx"), [
      '<p className="font-brand-heading text-ui-card-title" />',
      '<p className="font-brand-bold text-ui-card-title" />',
      '<p className="font-ui-medium text-ui-card-title tracking-[-0.01em]" />',
      '<p className="font-ui-bold font-semibold text-ui-card-title" />',
      '<p className={cn("font-ui-bold", "font-semibold", "text-ui-card-title")} />',
      '.bad { font-weight: 600; }',
    ].join("\n"));
    fs.writeFileSync(path.join(fixtureRoot, "components", "header.tsx"), '<div className="font-brand-bold text-ui-body">도깨비테니스</div>');
    const violations = collectViolations(["app/fixture.tsx", "components/header.tsx"], fixtureRoot);
    const rules = new Set(violations.map((violation) => violation.rule));
    const expected = ["small-brand-font", "small-negative-tracking", "multiple-font-weight-utilities", "unsupported-600"];
    const baselinePasses = collectViolations(["app/valid.tsx", "components/header.tsx"], fixtureRoot).length === 0;
    fs.writeFileSync(path.join(fixtureRoot, "tailwind.config.ts"), "export default {};");
    const missingSemibold = collectViolations([], fixtureRoot).some((issue) => issue.rule === "semibold-500-mapping");
    fs.writeFileSync(path.join(fixtureRoot, "tailwind.config.ts"), 'export default { semibold: "600" };');
    const restored600 = collectViolations([], fixtureRoot).some((issue) => issue.rule === "semibold-500-mapping");
    if (expected.every((rule) => rules.has(rule)) && baselinePasses && missingSemibold && restored600) console.log("✅ typography policy detector self-test: 실제 검사 흐름의 위반/허용 fixture 확인");
    else process.exitCode = 1;
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

if (process.argv.includes("--self-test")) {
  runSelfTest();
  process.exit();
}

const files = [...TARGET_DIRS.flatMap((dir) => walk(dir)), "tailwind.config.ts", "app/globals.css"];
const violations = collectViolations(files);
if (violations.length === 0) {
  console.log("✅ typography policy check: 위반 없음 (tailwind.config.ts의 font-semibold: 500 매핑 검증 완료)");
  process.exit(0);
}
console.error("❌ typography policy check: 정책 위반 발견");
for (const issue of violations.sort((a, b) => `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`))) {
  console.error(`- [${issue.rule}] ${issue.file}:${issue.line} -> ${issue.token}`);
}
process.exit(1);
