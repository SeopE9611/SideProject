import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const writeSources = ["free", "market", "gear"].map((type) => ({ type, path: `app/board/${type}/_components/FreeBoardWriteClient.tsx`, source: read(`app/board/${type}/_components/FreeBoardWriteClient.tsx`) }));
const editSources = ["free", "market", "gear"].map((type) => ({ type, path: `app/board/${type}/[id]/edit/_components/FreeBoardEditClient.tsx`, source: read(`app/board/${type}/[id]/edit/_components/FreeBoardEditClient.tsx`) }));

// 댓글과 상태 메모 Textarea는 계속 필요하므로 게시글 본문 id만 정확히 검사합니다.
// import뿐 아니라 JSX, 상태 저장, 검증까지 연결됐는지를 함께 확인합니다.
for (const group of [writeSources, editSources]) {
  for (const { type, path, source } of group) {
    test(`${type} ${group === writeSources ? "작성" : "수정"} 리치 텍스트 연결 계약`, () => {
      assert.match(source, /import\s+\{\s*RichTextEditor\s*\}\s+from/);
      assert.match(source, /import\s+\{\s*richTextToValidationText\s*\}\s+from/);
      assert.match(source, /COMMUNITY_RICH_TEXT_CONTENT_MIN[\s\S]*COMMUNITY_RICH_TEXT_CONTENT_MAX/);
      assert.match(source, /<RichTextEditor[\s\S]*?value=\{content\}[\s\S]*?change\.html[\s\S]*?maxLength=\{COMMUNITY_RICH_TEXT_CONTENT_MAX\}/);
      assert.match(source, /richTextToValidationText\(content\)\.length/);
      assert.doesNotMatch(source, /<Textarea[\s\S]{0,500}id="content"/);
      assert.doesNotMatch(source, /contentLength\s*,\s*setContentLength/);
      assert.doesNotMatch(source, /hasHtmlLike\(c\)|hasScriptLike\(c\)/);
      assert.match(source, /content:\s*(?:content\.trim\(\)|c)/);
    });
  }
}

test("작성 화면은 실제 텍스트 길이로 dirty를 판단한다", () => {
  for (const { source } of writeSources) {
    assert.match(source, /contentValidationLength\s*>\s*0/);
  }
});

test("수정 화면은 HTML baseline, 충돌 복구, 서버 상세 메시지를 보존한다", () => {
  for (const { source } of editSources) {
    assert.match(source, /const nextContent = item\.content \?\? "";/);
    assert.match(source, /content:\s*nextContent/);
    assert.match(source, /content !== b\.content/);
    assert.match(source, /clientSeenDate/);
    assert.match(source, /res\.status === 409/);
    assert.match(source, /json\?\.details\?\.\[0\]\?\.message/);
  }
});

test("공용 상세는 대상 타입만 안전한 리치 본문으로 렌더링한다", () => {
  const source = read("app/board/_components/BoardDetailClient.tsx");
  assert.match(source, /import\s+\{\s*RichTextContent\s*\}\s+from/);
  assert.match(source, /import\s+\{\s*isCommunityRichTextType\s*\}\s+from/);
  assert.match(source, /isCommunityRichTextType\(item\.type\)[\s\S]*?<RichTextContent[\s\S]*?content=\{item\.content\}/);
  assert.match(source, /\{item\.content\}/);
  assert.match(source, /<Textarea/);
  assert.match(source, /item\.marketMeta\.conditionNote/);
});

test("정책은 free, market, gear만 리치 텍스트 대상으로 둔다", () => {
  const source = read("lib/community/community-rich-text-policy.ts");
  assert.match(source, /"free"/);
  assert.match(source, /"market"/);
  assert.match(source, /"gear"/);
  assert.doesNotMatch(source, /"brand"/);
});

const handleSubmitBlock = (source) => {
  const start = source.indexOf("const handleSubmit");
  assert.notEqual(start, -1, "handleSubmit 함수를 찾을 수 있어야 합니다.");
  const end = source.indexOf("\n  return (", start);
  return source.slice(start, end === -1 ? undefined : end);
};

const richTextEditorBlock = (source) => {
  const start = source.indexOf("<RichTextEditor");
  assert.notEqual(start, -1, "RichTextEditor JSX를 찾을 수 있어야 합니다.");
  const end = source.indexOf("/>", start);
  return source.slice(start, end + 2);
};

test("free, market, gear 작성은 handleSubmit에서 공용 리치 텍스트 작성 API를 사용한다", () => {
  for (const { type, source } of writeSources) {
    const submit = handleSubmitBlock(source);
    assert.match(submit, /communityFetch\("\/api\/boards"/, `${type} 작성은 /api/boards를 사용해야 합니다.`);
    assert.doesNotMatch(
      submit,
      /communityFetch\("\/api\/community\/posts"/,
      `${type} 작성은 구형 POST 경로를 사용하면 안 됩니다.`,
    );
  }
});

test("자유 게시판 본문 편집은 JSX 범위에서 본문 오류를 해제하고 invalid 상태를 전달한다", () => {
  const freeSource = writeSources.find(({ type }) => type === "free").source;
  const editor = richTextEditorBlock(freeSource);

  assert.match(editor, /onChange=\{\(change\) => \{[\s\S]*?setContent\(change\.html\);/);
  assert.match(
    editor,
    /if \(fieldErrors\.content\) \{[\s\S]*?setFieldErrors\(\(prev\) => \(\{[\s\S]*?content: undefined,/,
  );
  assert.match(editor, /invalid=\{Boolean\(fieldErrors\.content\)\}/);
});

test("작성 화면은 공용 API 오류 메시지 helper를 직접 연결한다", () => {
  for (const { type, source } of writeSources) {
    const submit = handleSubmitBlock(source);
    assert.match(
      source,
      /import\s+\{\s*getApiErrorMessage\s*\}\s+from\s+["']@\/lib\/fetchers\/getApiErrorMessage["']/,
      `${type} 작성은 공용 오류 메시지 helper를 직접 import해야 합니다.`,
    );
    assert.match(
      submit,
      /getApiErrorMessage\([\s\S]*?data[\s\S]*?WRITE_ERROR_MESSAGE/,
      `${type} 작성 실패 처리는 fallback과 함께 공용 helper를 호출해야 합니다.`,
    );
    assert.doesNotMatch(
      submit,
      /(?:emitServerError|setErrorMsg)\(data\?\.error\)/,
      `${type} 작성은 오류 객체를 UI 상태 함수에 직접 전달하면 안 됩니다.`,
    );
  }
});

test("작성 화면은 공용 helper 결과를 기존 오류 UI로 전달한다", () => {
  const freeSource = writeSources.find(({ type }) => type === "free").source;
  const marketSource = writeSources.find(({ type }) => type === "market").source;
  const gearSource = writeSources.find(({ type }) => type === "gear").source;

  assert.match(handleSubmitBlock(freeSource), /emitServerError\(getApiErrorMessage\(/);
  assert.match(handleSubmitBlock(marketSource), /emitServerError\(getApiErrorMessage\(/);
  assert.match(handleSubmitBlock(gearSource), /setErrorMsg\(getApiErrorMessage\(/);
});
