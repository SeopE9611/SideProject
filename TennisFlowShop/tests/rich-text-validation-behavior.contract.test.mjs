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
const {
  normalizeRichTextValue,
  prepareRichTextHtmlForSanitization,
  richTextToPlainText,
  richTextToValidationText,
} = await import(moduleUrl);

test("sanitizer 준비 함수는 raw/entity 일반 텍스트를 동일한 HTML로 정규화한다", () => {
  assert.equal(prepareRichTextHtmlForSanitization("A&B"), "<p>A&amp;B</p>");
  assert.equal(prepareRichTextHtmlForSanitization("A&amp;B"), "<p>A&amp;B</p>");
});

test("sanitizer 준비 함수는 raw/entity 부등호와 줄바꿈 일반 텍스트를 안전한 HTML로 만든다", () => {
  assert.equal(prepareRichTextHtmlForSanitization("2 < 3"), "<p>2 &lt; 3</p>");
  assert.equal(prepareRichTextHtmlForSanitization("2 &lt; 3"), "<p>2 &lt; 3</p>");
  assert.equal(
    prepareRichTextHtmlForSanitization("첫째 줄\r\n둘째 줄"),
    "<p>첫째 줄<br>둘째 줄</p>",
  );
});

test("sanitizer 준비 함수는 기존 HTML을 유지하고 RichTextContent 재정규화와 호환된다", () => {
  assert.equal(
    prepareRichTextHtmlForSanitization("<p>A&amp;B</p>"),
    "<p>A&amp;B</p>",
  );

  const prepared = prepareRichTextHtmlForSanitization("A&amp;B");
  assert.equal(normalizeRichTextValue(prepared), prepared);
});

test("sanitizer 준비 함수는 entity로 인코딩된 태그를 실행 가능한 HTML로 만들지 않는다", () => {
  const prepared = prepareRichTextHtmlForSanitization(
    "&lt;script&gt;alert(1)&lt;/script&gt;",
  );

  assert.equal(prepared, "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
  assert.doesNotMatch(prepared, /<script>/i);
});

test("sanitizer 준비 함수는 빈 값을 빈 리치 텍스트 HTML로 정규화한다", () => {
  for (const value of ["", "   ", null, undefined]) {
    assert.equal(prepareRichTextHtmlForSanitization(value), "<p></p>");
  }
});

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

test("검증용 텍스트는 여러 문단의 구조적 경계를 글자로 계산하지 않는다", () => {
  const html =
    "<p>a</p>" +
    "<p>b</p>" +
    "<p>c</p>" +
    "<p>d</p>" +
    "<p>e</p>" +
    "<p>f</p>";

  // 6글자 본문이 문단 구조의 개행 때문에 최소 10자 검증을 통과하는 회귀를 막는다.
  const result = richTextToValidationText(html);
  assert.equal(result, "abcdef");
  assert.equal(result.length, 6);
  assert.ok(result.length < 10);
});

test("검증용 텍스트는 목록 항목 경계를 글자로 계산하지 않는다", () => {
  const html =
    "<ul>" +
    "<li><p>a</p></li>" +
    "<li><p>b</p></li>" +
    "<li><p>c</p></li>" +
    "<li><p>d</p></li>" +
    "</ul>";

  // 4글자 목록이 </p>와 </li> 구조 개행으로 최소 10자를 우회하지 못하게 한다.
  const result = richTextToValidationText(html);
  assert.equal(result, "abcd");
  assert.equal(result.length, 4);
  assert.ok(result.length < 10);
});

test("검증용 텍스트는 다중 문단의 실제 8000자를 정확히 계산한다", () => {
  const first = "a".repeat(4000);
  const second = "b".repeat(4000);

  // 블록 경계 하나 때문에 정확히 8,000자인 본문을 8,001자로 거부하는 회귀를 막는다.
  const result = richTextToValidationText(
    `<p>${first}</p><p>${second}</p>`,
  );
  assert.equal(result.length, 8000);
  assert.equal(result, `${first}${second}`);
});

test("검증용 텍스트는 실제 hard break를 유지하고 임의 축약하지 않는다", () => {
  const result = richTextToValidationText("<p>a<br><br><br>b</p>");

  assert.equal(result, "a\n\n\nb");
  assert.equal(result.length, 5);
});

test("표시용 텍스트는 기존처럼 과도한 줄바꿈을 읽기 좋게 축약한다", () => {
  assert.equal(
    richTextToPlainText("<p>a<br><br><br>b</p>"),
    "a\n\nb",
  );
});
