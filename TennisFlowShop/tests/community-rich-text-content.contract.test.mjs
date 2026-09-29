import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function getFunctionSource(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);

  assert.notEqual(start, -1, `시작 지점을 찾지 못했습니다: ${startMarker}`);
  assert.notEqual(end, -1, `종료 지점을 찾지 못했습니다: ${endMarker}`);

  return source.slice(start, end);
}

function assertOrderedAfter(source, anchor, snippets) {
  let cursor = source.indexOf(anchor);

  assert.notEqual(cursor, -1, `기준 코드를 찾지 못했습니다: ${anchor}`);

  for (const snippet of snippets) {
    const next = source.indexOf(snippet, cursor + 1);
    assert.ok(next > cursor, `${snippet}가 올바른 순서에 없습니다.`);
    cursor = next;
  }
}

const policySource = read("lib/community/community-rich-text-policy.ts");
const boardsSource = read("app/api/boards/route.ts");
const communityPostSource = read("app/api/community/posts/[id]/route.ts");
const postSource = getFunctionSource(boardsSource, "export async function POST", "// 표시명 결정");
const getSource = getFunctionSource(
  communityPostSource,
  "export async function GET",
  "export async function PATCH",
);
const patchSource = getFunctionSource(
  communityPostSource,
  "export async function PATCH",
  "export async function DELETE",
);

test("커뮤니티 리치 텍스트 정책은 free, market, gear만 허용한다", () => {
  assert.match(policySource, /"free"/);
  assert.match(policySource, /"market"/);
  assert.match(policySource, /"gear"/);
  assert.doesNotMatch(policySource, /COMMUNITY_RICH_TEXT_TYPES\s*=\s*\[[^\]]*"brand"/s);
  assert.match(policySource, /COMMUNITY_RICH_TEXT_CONTENT_MIN\s*=\s*10/);
  assert.match(policySource, /COMMUNITY_RICH_TEXT_CONTENT_MAX\s*=\s*5000/);
  assert.match(policySource, /export\s+function\s+isCommunityRichTextType/);
});

test("커뮤니티 POST는 본문을 정제 및 검증한 뒤 글 번호를 생성하고 저장한다", () => {
  assert.match(postSource, /isCommunityRichTextType\(body\.type\)/);
  assert.match(postSource, /sanitizeRichTextHtml\(/);
  assert.match(postSource, /richTextToValidationText\(safeContent\)/);
  assert.match(postSource, /validateSanitizedLength\(validationText/);
  assert.match(postSource, /COMMUNITY_RICH_TEXT_CONTENT_MIN/);
  assert.match(postSource, /COMMUNITY_RICH_TEXT_CONTENT_MAX/);
  assert.match(postSource, /content:\s*safeContent/);
  assert.doesNotMatch(postSource, /content:\s*body\.content/);
  assert.match(postSource, /내용은 10자 이상 입력해 주세요\./);
  assert.match(postSource, /내용은 5000자 이내로 입력해 주세요\./);
  assert.match(postSource, /normalizeMarketMeta/);
  assert.match(postSource, /safeImages/);
  assert.match(postSource, /safeAttachments/);

  // import 위치가 아닌 실제 커뮤니티 분기 안의 호출 순서를 확인해 잘못된 본문이 번호를 소비하지 않게 한다.
  assertOrderedAfter(postSource, "if (isCommunityRichTextType(body.type))", [
    "sanitizeRichTextHtml",
    "richTextToValidationText(safeContent)",
    "validateSanitizedLength(validationText",
    "countersCol.findOneAndUpdate",
    '.collection<Omit<CommunityPostMongoDoc, "_id">>("community_posts")',
  ]);
});

test("커뮤니티 GET은 리치 타입의 레거시 본문을 재정제해 읽기 전용으로 응답한다", () => {
  assert.match(getSource, /isCommunityRichTextType\(doc\.type\)/);
  assert.match(getSource, /prepareRichTextHtmlForSanitization/);
  assert.match(getSource, /sanitizeRichTextHtml/);
  assert.match(
    getSource,
    /sanitizeRichTextHtml\(\s*prepareRichTextHtmlForSanitization\(/s,
  );
  assert.match(getSource, /content:\s*responseContent/);
  assert.doesNotMatch(getSource, /content:\s*doc\.content/);
  assert.doesNotMatch(getSource, /doc\.content\s*=/);
  assert.doesNotMatch(getSource, /\.updateOne\s*\(/);
  assert.doesNotMatch(getSource, /\.findOneAndUpdate\s*\(/);
  assert.match(getSource, /likedByMe/);
  assert.match(getSource, /doc\.status[^\n]*===\s*"hidden"/);
  assert.doesNotMatch(getSource, /\$inc\s*:\s*\{\s*views/);
});

test("커뮤니티 PATCH는 저장된 타입으로 리치 정책을 선택하고 기존 보호 정책을 유지한다", () => {
  assert.match(communityPostSource, /content:\s*z\.string\(\)\.max\(20000\)\.optional\(\)/);
  assert.match(patchSource, /isCommunityRichTextType\(doc\.type\)/);
  assert.match(patchSource, /sanitizeRichTextHtml\(body\.content\)/);
  assert.match(patchSource, /richTextToValidationText\(safeContent\)/);
  assert.match(patchSource, /COMMUNITY_RICH_TEXT_CONTENT_MIN/);
  assert.match(patchSource, /COMMUNITY_RICH_TEXT_CONTENT_MAX/);
  assert.match(patchSource, /sanitizedContent\s*=\s*safeContent/);
  assert.match(patchSource, /update\.content\s*=\s*sanitizedContent/);
  assert.match(patchSource, /내용은 10자 이상 입력해 주세요\./);
  assert.match(patchSource, /내용은 5000자 이내로 입력해 주세요\./);
  assert.match(patchSource, /normalizeSanitizedContent\(await sanitizeHtml\(body\.content\)\)/);
  assert.match(patchSource, /clientSeenDate/);
  assert.match(patchSource, /ifUnmodifiedSince/);
  assert.match(patchSource, /classifyBoardPatchFailure/);
  assert.match(patchSource, /error:\s*"conflict"/);
  assert.match(patchSource, /normalizeMarketMeta/);

  assertOrderedAfter(patchSource, "if (isCommunityRichTextType(doc.type))", [
    "sanitizeRichTextHtml(body.content)",
    "richTextToValidationText(safeContent)",
    "validateSanitizedLength(validationText",
    "col.updateOne",
  ]);
});
