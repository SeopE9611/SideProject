import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const writeSource = read("app/board/notice/_components/NoticeWriteClient.tsx");
const detailSource = read("app/board/notice/_components/NoticeDetailClient.tsx");

// 단순 import 잔존이 아니라 실제 편집·렌더링 연결이 되돌아가지 않도록 UI 경계를 확인한다.
test("공지·이벤트 작성 화면은 공용 RichTextEditor를 사용한다", () => {
  assert.match(
    writeSource,
    /import\s*\{\s*RichTextEditor\s*\}\s*from\s*["']@\/components\/editor\/RichTextEditor["']/,
  );
  assert.match(
    writeSource,
    /import\s*\{\s*richTextToValidationText\s*\}\s*from\s*["']@\/components\/editor\/rich-text-utils["']/,
  );
  assert.doesNotMatch(writeSource, /@\/components\/ui\/textarea/);
  assert.doesNotMatch(writeSource, /<Textarea\b/);
  assert.match(writeSource, /<RichTextEditor\b/);
  assert.match(writeSource, /<RichTextEditor[\s\S]*?\bvalue=\{content\}/);
  assert.match(writeSource, /<RichTextEditor[\s\S]*?\bmaxLength=\{CONTENT_MAX\}/);
  assert.match(writeSource, /<RichTextEditor[\s\S]*?\bdisabled=\{submitting\}/);
  assert.match(writeSource, /onChange=\{\s*\(change\)\s*=>\s*\{\s*setContent\(change\.html\);/);
  assert.match(writeSource, /placeholder=\{\s*isEventMode\s*\?\s*["']이벤트 내용을 작성해주세요["']/);
  assert.match(writeSource, /ariaLabel=\{isEventMode\s*\?\s*["']이벤트 본문 편집기["']/);
});

test("공지·이벤트 작성 화면은 HTML 길이가 아니라 화면상 본문 길이를 검증한다", () => {
  assert.match(
    writeSource,
    /const\s+contentValidationLength\s*=\s*useMemo\(\s*\(\)\s*=>\s*richTextToValidationText\(content\)\.length/s,
  );
  assert.match(writeSource, /contentValidationLength\s*===\s*0/);
  assert.match(writeSource, /contentValidationLength\s*<\s*CONTENT_MIN/);
  assert.match(writeSource, /contentValidationLength\s*>\s*CONTENT_MAX/);
  assert.doesNotMatch(writeSource, /c\.length\s*[<>]=?\s*CONTENT_(?:MIN|MAX)/);
  assert.doesNotMatch(writeSource, /content\.length\s*[<>]=?\s*CONTENT_(?:MIN|MAX)/);
  assert.doesNotMatch(writeSource, /hasHtmlLike\(c\)/);
  assert.doesNotMatch(writeSource, /hasScriptLike\(c\)/);
  assert.match(writeSource, /hasHtmlLike\(t\)/);
  assert.match(writeSource, /hasScriptLike\(t\)/);
  assert.match(writeSource, /content:\s*c,/);
});

test("리치 텍스트 연결 후에도 수정 프리필과 충돌 복구의 HTML 스냅샷을 유지한다", () => {
  const prefills = writeSource.match(/setContent\(p\.content\s*\?\?\s*["']["']\);/g) ?? [];

  assert.ok(prefills.length >= 2, "프리필과 충돌 복구 모두 최신 HTML을 적용해야 합니다.");
  assert.match(writeSource, /initialRef\.current\s*=\s*\{[\s\S]*?content:\s*p\.content\s*\?\?\s*["']/);
  assert.match(writeSource, /content\s*!==\s*base\.content/);
  assert.match(writeSource, /clientSeenDate/);
  assert.match(writeSource, /mutate\(`\/api\/boards\/\$\{editId\}`\)/);
  assert.match(writeSource, /setSelectedFiles\(\[\]\)/);
  assert.match(writeSource, /setRemovedPaths\(\[\]\)/);
  assert.match(writeSource, /setConflictError\(null\)/);
});

test("공지·이벤트 작성 화면은 서버 유효성 메시지와 충돌 처리를 유지한다", () => {
  assert.match(writeSource, /res\.status\s*===\s*409\s*&&\s*json\?\.error\s*===\s*["']conflict["']/);
  assert.match(writeSource, /Array\.isArray\(json\?\.details\)/);
  assert.match(writeSource, /typeof\s+json\.details\[0\]\?\.message\s*===\s*["']string["']/);
  assert.match(writeSource, /validationMessage\s*\?\?/);
});

test("공지·이벤트 상세 화면은 서버에서 정제된 HTML을 RichTextContent로 렌더링한다", () => {
  assert.match(
    detailSource,
    /import\s*\{\s*RichTextContent\s*\}\s*from\s*["']@\/components\/editor\/RichTextContent["']/,
  );
  assert.match(detailSource, /<RichTextContent\b/);
  assert.match(detailSource, /<RichTextContent[\s\S]*?\bcontent=\{notice\.content\}/);
  assert.doesNotMatch(detailSource, /String\(notice\.content\s*\|\|\s*["']["']\)/);
  assert.doesNotMatch(detailSource, /whitespace-pre-line/);
  assert.match(detailSource, /border-t\s+border-border\s+bg-card\s+p-5\s+sm:p-6\s+md:p-8/);
});
