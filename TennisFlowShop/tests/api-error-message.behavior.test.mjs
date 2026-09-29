import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(
  new URL("../lib/fetchers/getApiErrorMessage.ts", import.meta.url),
  "utf8",
);
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`;
const { getApiErrorMessage } = await import(moduleUrl);
const fallback = "기본 오류";

const assertMessage = (payload, expected) => {
  const result = getApiErrorMessage(payload, fallback);
  assert.equal(typeof result, "string");
  assert.equal(result, expected);
};

test("details[0].message를 가장 먼저 사용한다", () => {
  assertMessage({ details: [{ message: "상세 오류" }], message: "일반 메시지", error: "오류 코드" }, "상세 오류");
});

test("message를 string error보다 먼저 사용한다", () => {
  assertMessage({ message: "일반 메시지", error: "오류 코드" }, "일반 메시지");
});

test("string error를 사용한다", () => {
  assertMessage({ error: "validation_error" }, "validation_error");
});

test("중첩 error.message를 사용한다", () => {
  assertMessage({ error: { message: "중첩 메시지" } }, "중첩 메시지");
});

test("Zod formErrors를 사용한다", () => {
  assertMessage({ error: { formErrors: ["폼 오류"], fieldErrors: { content: ["본문 오류"] } } }, "폼 오류");
});

test("Zod fieldErrors를 사용한다", () => {
  assertMessage({ error: { formErrors: [], fieldErrors: { content: ["본문 오류"] } } }, "본문 오류");
});

test("빈 문자열을 건너뛴다", () => {
  assertMessage({ details: [{ message: " " }], message: "", error: { fieldErrors: { title: ["", "제목 오류"] } } }, "제목 오류");
});

test("지원하지 않는 오류 객체는 fallback을 사용한다", () => {
  assertMessage({ error: { code: 123 } }, fallback);
});

test("null, undefined, 숫자, 배열은 fallback을 사용한다", () => {
  for (const payload of [null, undefined, 123, []]) assertMessage(payload, fallback);
});

test("순환 참조 객체도 fallback을 사용한다", () => {
  const payload = {};
  payload.error = payload;
  assertMessage(payload, fallback);
});
