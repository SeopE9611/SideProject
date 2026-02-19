#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = process.argv.slice(2);
const scanDirs = TARGET_DIRS.length > 0 ? TARGET_DIRS : ['app', 'components'];
const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.mdx']);
const palettes = [
  'slate','gray','zinc','neutral','stone','red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose'
];
const keywords = ['bg', 'text', 'border', 'ring', 'from', 'to', 'via'];
const paletteAlternation = palettes.join('|');
const keywordAlternation = keywords.join('|');
const tokenRegex = new RegExp(`(?:[\\w-]+:)*(${keywordAlternation})-(${paletteAlternation})-(\\d{2,3})(?:\\/\\d{1,3})?`, 'g');

function walk(dir, results = []) {
  const absDir = path.join(ROOT, dir);
  if (!fs.existsSync(absDir)) return results;
  for (const ent of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.next' || ent.name === '.git') continue;
    const abs = path.join(absDir, ent.name);
    const rel = path.relative(ROOT, abs);
    if (ent.isDirectory()) {
      walk(rel, results);
    } else if (exts.has(path.extname(ent.name))) {
      results.push(rel);
    }
  }
  return results;
}

function classify(file) {
  const normalized = file.replaceAll('\\', '/');
  if (normalized.startsWith('app/board/')) return 'app/board';
  if (normalized.startsWith('app/rackets/')) return 'app/rackets';
  if (normalized.startsWith('app/mypage/')) return 'app/mypage';
  if (normalized.startsWith('app/admin/')) return 'app/admin';
  if (normalized.startsWith('components/ui/')) return 'components/ui';
  if (normalized.startsWith('app/')) return 'app/others';
  if (normalized.startsWith('components/')) return 'components/others';
  return 'others';
}

const files = scanDirs.flatMap((d) => walk(d));
const grouped = new Map();
let total = 0;

for (const file of files) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const hits = text.match(tokenRegex);
  if (!hits?.length) continue;
  total += hits.length;
  const group = classify(file);
  if (!grouped.has(group)) grouped.set(group, []);
  const counts = new Map();
  for (const token of hits) counts.set(token, (counts.get(token) ?? 0) + 1);
  grouped.get(group).push({ file, counts });
}

const sortedGroups = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));
console.log(`# color-class scan`);
console.log(`- scanned files: ${files.length}`);
console.log(`- total matches: ${total}`);
console.log('');
for (const [group, items] of sortedGroups) {
  const groupTotal = items.reduce((sum, item) => sum + [...item.counts.values()].reduce((s, n) => s + n, 0), 0);
  console.log(`## ${group} (${groupTotal})`);
  for (const item of items.sort((a, b) => a.file.localeCompare(b.file))) {
    const tokenList = [...item.counts.entries()].sort((a, b) => b[1] - a[1]).map(([token, count]) => `${token}×${count}`).join(', ');
    console.log(`- ${item.file}`);
    console.log(`  - ${tokenList}`);
  }
  console.log('');
}
