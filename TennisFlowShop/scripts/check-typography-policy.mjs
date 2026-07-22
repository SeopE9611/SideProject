#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = ["app", "components"];
const EXTENSIONS = new Set([".ts", ".tsx", ".css"]);
const SMALL_UI_TEXT = /\btext-(?:ui-(?:micro|caption|label|body(?:-sm|-lg)?|card-title(?:-lg)?|section-title)|\[(?:[0-9]|1[0-9]|20)px\])/;
const BRAND_CLASS = /\bfont-brand-(?:heading|display)\b/;
const NEGATIVE_TRACKING = /\btracking-\[-(?:0(?:\.\d+)?|\.\d+)em\]/;
const DIRECT_600 = /(?:font-weight\s*:\s*600\b|fontWeight\s*:\s*["'`]?(?:600|"600"|'600')["'`]?|\bsemibold\s*:\s*["'`]600["'`])/g;
const BANNED_MODULE_PATTERN = /\.(?:marketingTitle|brandTitle)\s*\{[^}]*?(?:GmarketSans|--home-brand-font-family)[^}]*?\}/gs;

function walk(dir, result = []) {
  const absDir = path.join(ROOT, dir);
  if (!fs.existsSync(absDir)) return result;
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, result);
    else if (EXTENSIONS.has(path.extname(entry.name))) result.push(rel.replaceAll("\\", "/"));
  }
  return result;
}

function lineAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function findClassGroups(source) {
  const groups = [];
  const quoted = /(?:className|class)\s*=\s*["']([^"']*)["']/g;
  const expression = /(?:className|class)\s*=\s*\{([\s\S]*?)\}/g;
  for (const match of source.matchAll(quoted)) groups.push({ text: match[1], index: match.index ?? 0 });
  for (const match of source.matchAll(expression)) {
    // cn() and template literals can span lines; retain every utility string in the expression.
    const utilities = [...match[1].matchAll(/["'`]([^"'`]*)["'`]/g)].map((item) => item[1]).join(" ");
    groups.push({ text: utilities, index: match.index ?? 0 });
  }
  return groups;
}

function collectViolations(files) {
  const violations = [];
  for (const file of files) {
    const source = fs.readFileSync(path.join(ROOT, file), "utf8");
    for (const match of source.matchAll(DIRECT_600)) {
      violations.push({ file, line: lineAt(source, match.index ?? 0), rule: "unsupported-600", token: match[0] });
    }
    if (file.endsWith(".css")) {
      for (const match of source.matchAll(BANNED_MODULE_PATTERN)) {
        violations.push({ file, line: lineAt(source, match.index ?? 0), rule: "small-brand-css-module", token: match[0].split("\n")[0] });
      }
    }
    for (const group of findClassGroups(source)) {
      if (!SMALL_UI_TEXT.test(group.text)) continue;
      if (BRAND_CLASS.test(group.text)) violations.push({ file, line: lineAt(source, group.index), rule: "small-brand-font", token: group.text });
      if (NEGATIVE_TRACKING.test(group.text)) violations.push({ file, line: lineAt(source, group.index), rule: "small-negative-tracking", token: group.text });
    }
  }
  return violations;
}

if (process.argv.includes("--self-test")) {
  const fixture = '<h2 className="font-brand-heading text-ui-card-title tracking-[-0.01em]" />\n.x { font-weight: 600; }';
  const failures = [
    SMALL_UI_TEXT.test(fixture) && BRAND_CLASS.test(fixture),
    SMALL_UI_TEXT.test(fixture) && NEGATIVE_TRACKING.test(fixture),
    DIRECT_600.test(fixture),
  ];
  if (failures.every(Boolean)) console.log("✅ typography policy detector self-test: 위반 탐지 확인");
  else process.exitCode = 1;
  process.exit();
}

const files = [...TARGET_DIRS.flatMap((dir) => walk(dir)), "tailwind.config.ts", "app/globals.css"];
const violations = collectViolations(files);
if (violations.length === 0) {
  console.log("✅ typography policy check: 위반 없음 (font-semibold은 Tailwind 500으로 매핑됨)");
  process.exit(0);
}
console.error("❌ typography policy check: 정책 위반 발견");
for (const issue of violations.sort((a, b) => `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`))) {
  console.error(`- [${issue.rule}] ${issue.file}:${issue.line} -> ${issue.token}`);
}
process.exit(1);
