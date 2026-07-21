import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const source = fs.readFileSync(path.resolve(process.cwd(), "lib/sanitize.ts"), "utf8");

test("기존 sanitizeHtml과 리치 텍스트 전용 sanitizer를 분리한다", () => {
  assert.match(source, /export async function sanitizeHtml\(/);

  assert.match(source, /export async function sanitizeRichTextHtml\(/);
});

test("리치 텍스트 정책은 현재 에디터 기능에 필요한 태그만 허용한다", () => {
  for (const tag of [
    "p",
    "br",
    "h2",
    "h3",
    "ul",
    "ol",
    "li",
    "strong",
    "em",
    "u",
    "s",
    "blockquote",
    "a",
  ]) {
    assert.match(
      source,
      new RegExp(`RICH_TEXT_ALLOWED_TAGS[\\s\\S]*"${tag}"`),
      `${tag} 태그가 리치 텍스트 허용 정책에 없습니다.`,
    );
  }
});

test("리치 텍스트 style은 p, h2, h3의 text-align만 허용한다", () => {
  assert.match(source, /const RICH_TEXT_ALLOWED_STYLES/);

  assert.ok(source.includes('"text-align": [/^(left|center|right)$/]'));

  assert.doesNotMatch(source, /"\*"\s*:\s*\[\s*"style"\s*\]/);

  assert.doesNotMatch(source, /span\s*:\s*\[\s*"style"\s*\]/);
});

test("리치 텍스트 sanitizer는 allowedStyles와 링크 보안 정책을 적용한다", () => {
  assert.match(source, /allowedStyles:\s*RICH_TEXT_ALLOWED_STYLES/);

  assert.match(source, /allowedSchemes:\s*\["http",\s*"https"\]/);

  assert.match(source, /next\.target\s*=\s*"_blank"/);

  assert.match(source, /next\.rel\s*=\s*normalizeRel\(\)/);
});
