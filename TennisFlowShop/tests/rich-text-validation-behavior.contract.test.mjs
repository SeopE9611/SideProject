import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(
  new URL("../components/editor/rich-text-utils.ts", import.meta.url),
  "utf8",
);

// 별도 TypeScript 런타임 의존성을 추가하지 않고 순수 유틸의 실제 동작을 검증하기 위해 런타임에 ESM으로 변환한다.
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`;
const { richTextToPlainText, richTextToValidationText } = await import(moduleUrl);

test("검증용 텍스트는 빈 문단과 빈 제목 구조를 글자로 계산하지 않는다", () => {
  assert.equal(richTextToValidationText("<p></p>"), "");
  assert.equal(richTextToValidationText("<p><br></p>"), "");
  assert.equal(richTextToValidationText("<h2></h2><h3></h3>"), "");
});

test("검증용 텍스트는 빈 목록 항목 수와 무관하게 최소 길이 우회를 막는다", () => {
  const emptyListHtml = `<ul>${"<li><p></p></li>".repeat(12)}</ul>`;

  // 에디터가 생성한 빈 목록 구조만으로 최소 10자 정책을 통과하지 못해야 한다.
  const validationText = richTextToValidationText(emptyListHtml);
  assert.equal(validationText, "");
  assert.equal(validationText.length, 0);
  assert.ok(validationText.length < 10);
});

test("표시용 목록 기호와 검증용 실제 입력 텍스트를 분리한다", () => {
  const listHtml = "<ul><li><p>첫 번째</p></li><li><p>두 번째</p></li></ul>";
  const displayText = richTextToPlainText(listHtml);
  const validationText = richTextToValidationText(listHtml);

  assert.match(displayText, /•/);
  assert.doesNotMatch(validationText, /•/);
  assert.equal(validationText.replace(/\s/g, ""), "첫번째두번째");
});

test("검증용 텍스트는 사용자가 입력한 기호와 엔티티 및 일반 텍스트를 보존한다", () => {
  assert.equal(
    richTextToValidationText("<p>• 사용자가 직접 입력한 기호</p>"),
    "• 사용자가 직접 입력한 기호",
  );
  assert.equal(richTextToValidationText("<p>A&amp;B</p>"), "A&B");
  assert.equal(
    richTextToValidationText("안녕하세요\n공지 내용입니다."),
    "안녕하세요\n공지 내용입니다.",
  );
});
