import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

// 기존 테스트와 같은 방식으로 순수 TypeScript 함수만 로드합니다. DB에 연결하지 않습니다.
const root = resolve(import.meta.dirname, "../..");
const require = createRequire(import.meta.url);
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const loaded = { exports: {} };
  cache.set(file, loaded);
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const localRequire = (name) => name.startsWith("@/")
    ? load(resolve(root, "src", name.slice(2)) + ".ts")
    : name.startsWith(".") ? load(resolve(dirname(file), name) + ".ts") : require(name);
  new Function("require", "module", "exports", code)(localRequire, loaded, loaded.exports);
  return loaded.exports;
}
const rich = load(resolve(root, "src/features/news/news.rich-text.ts"));
const validation = load(resolve(root, "src/features/news/news.admin-validation.ts"));
const audit = load(resolve(root, "src/features/news/news.audit.ts"));
const text = (value, marks) => ({ type: "text", text: value, ...(marks ? { marks } : {}) });
const paragraph = (...content) => ({ type: "paragraph", content });
const doc = (...content) => ({ version: 1, document: { type: "doc", content } });
const parse = rich.parseNewsBodyDocument;
const ordinary = doc(paragraph(text("기존 본문 😀")));
const bold = doc(paragraph(text("기존 본문 😀", [{ type: "bold" }])));
const fields = { category: "notice", title: "제목", contentSafetyConfirmed: true };

test("일반 텍스트의 HTML 문자·줄바꿈·이모지를 텍스트로 보존", () => {
  const body = ["<script>alert(1)</script>\n다음 줄 😀", "두 번째 문단"];
  assert.deepEqual(rich.newsDocumentToBody(parse(rich.newsBodyToDocument(body))), body);
});
test("제목·목록·강제 줄바꿈과 링크 표시 텍스트 추출", () => {
  const value = doc({ type: "heading", attrs: { level: 2 }, content: [text("안내")] },
    { type: "bulletList", content: [{ type: "listItem", content: [paragraph(text("첫 항목"), { type: "hardBreak" }, text("설명"))] }] },
    { type: "orderedList", attrs: { start: 2 }, content: [{ type: "listItem", content: [paragraph(text("문의", [{ type: "link", attrs: { href: "https://example.com" } }]))] }] });
  assert.deepEqual(rich.newsDocumentToBody(parse(value)), ["안내", "첫 항목\n설명", "문의"]);
});
test("자동 요약은 JSON 속성·링크 주소를 포함하지 않음", () => {
  const result = validation.validateAdminNewsDraftInput({ ...fields, body: "위조 본문", bodyDocument: bold, summary: "위조 요약" }, true);
  assert.equal(result.ok, true);
  assert.equal(result.value.summary, "기존 본문 😀");
  assert.deepEqual(result.value.body, ["기존 본문 😀"]);
});
test("기존 일반 텍스트 역할과 안전 확인·버전 검증 유지", () => {
  const manual = { ...fields, slug: "original", summary: "수동 요약", body: "본문" };
  assert.equal(validation.validateAdminNewsDraftInput(manual).ok, true);
  assert.equal(validation.validateAdminNewsDraftInput({ ...manual, bodyDocument: bold }).ok, false);
  assert.equal(validation.validateAdminNewsDraftInput({ ...fields, bodyDocument: bold, contentSafetyConfirmed: false }, true).ok, false);
  assert.equal(validation.validateAdminNewsDraftUpdateInput({ ...fields, bodyDocument: bold }, true).formError, "invalid_version");
});
test("서식 없는 글의 제목만 저장할 때 JSON 생성 및 본문 정규화 없음", () => {
  const body = ["  원문\n줄바꿈  "];
  assert.deepEqual(rich.resolveNewsBodyUpdate(body, undefined, body), { ok: true, body });
  assert.deepEqual(rich.resolveNewsBodyUpdate(body, undefined, body, parse(rich.newsBodyToDocument(body))), { ok: true, body });
});
test("서식만 변경해도 저장·감사 대상이며 요약 갱신 기준은 텍스트", () => {
  const result = rich.resolveNewsBodyUpdate(["기존 본문 😀"], undefined, ["기존 본문 😀"], parse(bold));
  assert.equal(result.ok, true);
  assert.ok(result.bodyDocument);
  assert.equal(rich.sameNewsBodyText(["기존 본문 😀"], result.body), true);
  assert.equal(rich.sameNewsDocument(parse(ordinary), parse(bold)), false);
  const before = { slug: "original", category: "notice", title: "제목", summary: "수동 요약", body: result.body };
  assert.deepEqual(audit.getDraftChangedFields(before, { ...before, bodyDocument: parse(bold) }), ["bodyDocument"]);
});
test("링크 주소만 바뀌어도 서식 변경 감지", () => {
  const link = (href) => parse(doc(paragraph(text("문의", [{ type: "link", attrs: { href } }]))));
  assert.equal(rich.sameNewsDocument(link("https://example.com/a"), link("https://example.com/b")), false);
  assert.equal(rich.sameNewsBodyText(rich.newsDocumentToBody(link("https://example.com/a")), rich.newsDocumentToBody(link("https://example.com/b"))), true);
});
test("요약 범위 밖의 실제 텍스트 변경도 감지", () => {
  assert.equal(rich.sameNewsBodyText(["가".repeat(200) + "이전"], ["가".repeat(200) + "변경"]), false);
});
test("구형 요청은 서식을 보존하고 본문 불일치는 명시적 거부", () => {
  const stored = parse(bold);
  const result = rich.resolveNewsBodyUpdate(["기존 본문 😀"], stored, ["기존 본문 😀"]);
  assert.deepEqual(result.bodyDocument, stored);
  assert.deepEqual(rich.resolveNewsBodyUpdate(["기존 본문 😀"], stored, ["다른 본문"]), { ok: false, reason: "rich_text_required" });
  assert.deepEqual(rich.resolveNewsBodyUpdate(["불일치"], stored, ["불일치"]), { ok: false, reason: "invalid_body_document" });
});
for (const href of ["javascript:alert(1)", "data:text/html,test", "vbscript:test", "/relative", "//example.com", "https://exa\nmple.com", "https://user:password@example.com"]) {
  test(`위험하거나 허용 범위 밖인 링크 거부: ${JSON.stringify(href)}`, () => {
    assert.equal(parse(doc(paragraph(text("링크", [{ type: "link", attrs: { href } }])))), null);
  });
}
test("버전·노드·속성·자식 구조·중복 서식 거부", () => {
  for (const value of [
    { ...ordinary, version: 2 }, doc({ type: "image", attrs: { src: "https://example.com" } }),
    doc({ ...paragraph(text("본문")), attrs: { style: "color:red" } }),
    doc({ type: "heading", attrs: { level: 1 }, content: [text("본문")] }),
    doc({ type: "bulletList", content: [paragraph(text("잘못된 구조"))] }),
    doc(paragraph(text("본문", [{ type: "bold" }, { type: "bold" }]))),
    doc(paragraph(text("본문", [{ type: "link", attrs: { href: "https://example.com", class: "x" } }]))),
  ]) assert.equal(parse(value), null);
});
test("본문·문단·노드·중첩·직렬화 크기 상한", () => {
  assert.equal(parse(doc(paragraph(text("가".repeat(2001))))), null);
  assert.equal(parse(doc(...Array.from({ length: 51 }, () => paragraph(text("가"))))), null);
  assert.equal(parse(doc(...Array.from({ length: 6 }, () => paragraph(text("가".repeat(2000)))))), null);
  assert.equal(parse(doc(paragraph(...Array.from({ length: 2001 }, () => ({ type: "hardBreak" }))))), null);
  let nested = paragraph(text("본문"));
  for (let i = 0; i < 4; i++) nested = { type: "bulletList", content: [{ type: "listItem", content: [paragraph(text("항목")), nested] }] };
  assert.equal(parse(doc(nested)), null);
  const href = "https://example.com/" + "a".repeat(1800);
  assert.equal(parse(doc(...Array.from({ length: 40 }, () => paragraph(text("링크", [{ type: "link", attrs: { href } }]))))), null);
});
test("과거 감사 스냅샷은 해시 없이 유지하고 신규 서식은 해시만 기록", () => {
  const before = { slug: "original", category: "notice", title: "제목", publicationStatus: "draft", approvalStatus: "pending", publishedAt: null };
  assert.equal(audit.createNewsAuditSnapshot(before).bodyDocumentHash, undefined);
  const snapshot = audit.createNewsAuditSnapshot({ ...before, bodyDocument: parse(bold) });
  assert.match(snapshot.bodyDocumentHash, /^[a-f0-9]{64}$/);
  assert.equal(Object.hasOwn(snapshot, "bodyDocument"), false);
});

const programValidation = load(resolve(root, "src/features/programs/program.admin-validation.ts"));
const programAudit = load(resolve(root, "src/features/programs/program.audit.ts"));
const programFields = {
  category: "일상생활",
  slug: "daily-life",
  title: "프로그램",
  summary: "수동 요약",
  purpose: "수동 목적",
  operationStatusLabel: "운영 중",
  sortOrder: 100,
  contentSafetyConfirmed: true,
};

test("프로그램의 기존 문단과 제목·목적·요약 편집은 서식 문서를 만들지 않음", () => {
  const body = ["  첫 문단 <안내>\n줄바꿈 😀  ", "두 번째 문단"];
  const draft = programValidation.validateAdminProgramDraftInput({ ...programFields, body: body.join("\n\n") });
  assert.equal(draft.ok, true);
  assert.equal(draft.value.bodyDocument, undefined);
  assert.deepEqual(rich.resolveNewsBodyUpdate(body, undefined, draft.value.body), { ok: true, body });
  assert.deepEqual(rich.newsDocumentToBody(rich.newsBodyToDocument(body)), body);
});

test("프로그램 서식 요청의 본문은 JSON에서 추출하고 수동 필드를 보존", () => {
  const draft = programValidation.validateAdminProgramDraftInput({ ...programFields, body: "무시할 본문", bodyDocument: bold });
  assert.equal(draft.ok, true);
  assert.deepEqual(draft.value.body, ["기존 본문 😀"]);
  for (const key of ["slug", "summary", "purpose", "operationStatusLabel", "sortOrder"])
    assert.equal(draft.value[key], programFields[key]);
  assert.deepEqual(rich.resolveNewsBodyUpdate(draft.value.body, draft.value.bodyDocument, draft.value.body).bodyDocument, draft.value.bodyDocument);
  assert.equal(rich.resolveNewsBodyUpdate(draft.value.body, draft.value.bodyDocument, ["다른 본문"]).reason, "rich_text_required");
});

test("프로그램 요청에서도 위험한 링크, 노드, 속성, 길이와 목록 깊이를 거부", () => {
  let nested = paragraph(text("안내"));
  for (let i = 0; i < 4; i++)
    nested = { type: "bulletList", content: [{ type: "listItem", content: [paragraph(text("목록")), nested] }] };
  const rejected = [
    doc(paragraph(text("안내", [{ type: "link", attrs: { href: "javascript:alert(1)" } }]))),
    doc({ type: "image", attrs: { src: "https://example.com/test.png" } }),
    doc({ ...paragraph(text("안내")), attrs: { class: "example" } }),
    doc(paragraph(text("가".repeat(2001)))),
    doc(nested),
  ];
  for (const bodyDocument of rejected) {
    const draft = programValidation.validateAdminProgramDraftInput({ ...programFields, body: "유효한 일반 본문", bodyDocument });
    assert.equal(draft.ok, false);
    assert.ok(draft.fieldErrors.body);
  }
});

test("프로그램 서식·링크 변경은 본문과 구분해 기록하고 기존 감사 본문을 보존", () => {
  const link = (href) => parse(doc(paragraph(text("기존 본문 😀", [{ type: "link", attrs: { href } }]))));
  const before = { ...programFields, body: ["기존 본문 😀"], publicationStatus: "draft", approvalStatus: "pending", publishedAt: null };
  const linked = { ...before, bodyDocument: link("https://example.com/first") };
  const updated = { ...linked, bodyDocument: link("https://example.com/second") };
  assert.deepEqual(programAudit.getDraftChangedFields(before, linked), ["bodyDocument"]);
  assert.deepEqual(programAudit.getDraftChangedFields(linked, updated), ["bodyDocument"]);
  assert.deepEqual(programAudit.createProgramAuditSnapshot(before).body, before.body);
  assert.equal(programAudit.createProgramAuditSnapshot(before).bodyDocumentHash, undefined);
  const snapshot = programAudit.createProgramAuditSnapshot(updated);
  assert.match(snapshot.bodyDocumentHash, /^[a-f0-9]{64}$/);
  assert.equal(Object.hasOwn(snapshot, "bodyDocument"), false);
});
