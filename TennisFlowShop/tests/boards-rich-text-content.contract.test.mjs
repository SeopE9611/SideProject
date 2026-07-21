import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const createSource = read("app/api/boards/route.ts");
const patchSource = read("app/api/boards/[id]/route.ts");

function assertOrderedAfter(source, anchor, snippets) {
  let cursor = source.indexOf(anchor);

  assert.notEqual(cursor, -1, `기준 코드를 찾지 못했습니다: ${anchor}`);

  for (const snippet of snippets) {
    const next = source.indexOf(snippet, cursor + 1);

    assert.ok(next > cursor, `${snippet}가 올바른 순서에 없습니다.`);
    cursor = next;
  }
}

test("공지 작성 API는 정제 HTML의 화면상 텍스트 길이를 검증한 뒤 저장한다", () => {
  assert.match(createSource, /sanitizeRichTextHtml/);
  assert.match(
    createSource,
    /import\s*\{\s*richTextToValidationText\s*\}\s*from\s*["']@\/components\/editor\/rich-text-utils["']/,
  );
  assert.match(createSource, /if\s*\(body\.type\s*===\s*["']notice["']\)/);
  assert.match(createSource, /safeContent\s*=\s*await\s+sanitizeRichTextHtml\(/);
  assert.match(createSource, /richTextToValidationText\(safeContent\)/);
  assert.doesNotMatch(createSource, /richTextToPlainText\(safeContent\)/);
  assert.match(createSource, /const NOTICE_CONTENT_MIN\s*=\s*10/);
  assert.match(createSource, /const NOTICE_CONTENT_MAX\s*=\s*8000/);
  assert.match(
    createSource,
    /validateSanitizedLength\(validationText,\s*\{\s*min:\s*NOTICE_CONTENT_MIN,\s*max:\s*NOTICE_CONTENT_MAX,/s,
  );
  assert.match(createSource, /content:\s*safeContent/);
  assert.match(createSource, /safeContent\s*=\s*await\s+sanitizeHtml\(/);

  // import 위치가 아닌 notice 분기 뒤의 실제 호출을 기준으로 저장 전 처리 순서를 검증한다.
  assertOrderedAfter(createSource, 'if (body.type === "notice")', [
    "safeContent = await sanitizeRichTextHtml",
    "richTextToValidationText(safeContent)",
    "validateSanitizedLength(validationText",
    'collection<BoardCreateMongoDoc>("board_posts").insertOne',
  ]);
});

test("공지 수정 API는 저장된 post.type을 기준으로 검증하고 낙관적 락을 유지한다", () => {
  assert.match(patchSource, /sanitizeRichTextHtml/);
  assert.match(
    patchSource,
    /import\s*\{\s*richTextToValidationText\s*\}\s*from\s*["']@\/components\/editor\/rich-text-utils["']/,
  );
  assert.match(patchSource, /if\s*\(typeof patch\.content === ["']string["']\)/);
  assert.match(patchSource, /if\s*\(post\.type\s*===\s*["']notice["']\)/);
  assert.doesNotMatch(patchSource, /(?:parsed\.data|bodyRaw)\.type\s*===\s*["']notice["']/);
  assert.match(patchSource, /await\s+sanitizeRichTextHtml\(patch\.content\)/);
  assert.match(patchSource, /richTextToValidationText\(safeContent\)/);
  assert.doesNotMatch(patchSource, /richTextToPlainText\(safeContent\)/);
  assert.match(patchSource, /const NOTICE_CONTENT_MIN\s*=\s*10/);
  assert.match(patchSource, /const NOTICE_CONTENT_MAX\s*=\s*8000/);
  assert.match(
    patchSource,
    /validateSanitizedLength\(validationText,\s*\{\s*min:\s*NOTICE_CONTENT_MIN,\s*max:\s*NOTICE_CONTENT_MAX,/s,
  );
  assert.match(patchSource, /patch\.content\s*=\s*safeContent/);
  assert.match(patchSource, /patch\.content\s*=\s*await\s+sanitizeHtml\(patch\.content\)/);
  assert.match(patchSource, /clientSeenDateBody/);
  assert.match(patchSource, /updatedAt:\s*clientSeenDate/);

  // import 위치가 아닌 notice 분기 뒤의 실제 호출을 기준으로 DB 갱신 전 검증을 확인한다.
  assertOrderedAfter(patchSource, 'if (post.type === "notice")', [
    "const safeContent = await sanitizeRichTextHtml",
    "richTextToValidationText(safeContent)",
    "validateSanitizedLength(validationText",
    "let r = await col.updateOne",
  ]);
});

test("공지 작성과 수정 API는 동일한 본문 길이 오류 메시지를 제공한다", () => {
  for (const source of [createSource, patchSource]) {
    assert.match(source, /내용은 10자 이상 입력해 주세요\./);
    assert.match(source, /내용은 8000자 이내로 입력해 주세요\./);
  }
});
