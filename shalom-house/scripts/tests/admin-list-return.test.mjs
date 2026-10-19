import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

// Load only the pure TypeScript URL helpers and their enum dependencies; no server or DB code.
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
const { getAdminListReturnHref: back } = load(resolve(root, "src/lib/admin-list-return.ts"));
const { normalizeAdminNewsPage: normalize } = load(resolve(root, "src/features/news/news.pagination.ts"));
const paths = ["/admin/news", "/admin/programs", "/admin/gallery", "/admin/transparency"];
const cases = [
  [paths[0], { q: "후원 & 안내", category: "notice", publication: "review", approval: "pending", page: "2" }],
  [paths[1], { q: "생활 프로그램", publicationStatus: "draft", approvalStatus: "rejected", page: "3" }],
  [paths[2], { subjectPresence: "identifiable", consentStatus: "confirmed", publicationStatus: "published", page: "2" }],
  [paths[3], { category: "budget_settlement", privacyReviewStatus: "confirmed", finalDocumentStatus: "final", publicationStatus: "published", page: "4" }],
];
for (const [path, filters] of cases) {
  test(`${path}: allowed conditions survive and unknown parameters are removed`, () => {
    const query = new URLSearchParams({ ...filters, created: "1", updated: "1", returnTo: "https://example.com", donorId: "unrelated" });
    const result = back(path, `${path}?${query}`, normalize);
    assert.equal(result, `${path}?${new URLSearchParams(filters)}`);
    assert.equal(back(path, result, normalize), result);
  });
  test(`${path}: direct entry and unsafe destinations fall back to this list`, () => {
    for (const value of [undefined, null, 2, [], [path], [path, path], "", "https://example.com", "//example.com", "javascript:alert(1)", `${path}/other`, `${path}/../news`, path.replace("/admin/", "/admin\\"), `${path}#fragment`, `${path}?q=x\n`, path + "?q=" + "x".repeat(2048), ...paths.filter(p => p !== path)]) {
      assert.equal(back(path, value, normalize), path);
    }
    assert.equal(back(path, path, normalize), path);
  });
  test(`${path}: invalid and duplicate fields cannot override a valid condition`, () => {
    const query = new URLSearchParams();
    for (const key of Object.keys(filters)) {
      query.append(key, "invalid");
      query.append(key, filters[key]);
    }
    assert.equal(back(path, `${path}?${query}`, normalize), path);
    assert.equal(back(path, `${path}?publication=evil&publicationStatus=evil&category=evil&consentStatus=evil&page=2abc`, normalize), path);
  });
  test(`${path}: page is delegated to the supplied existing normalizer`, () => {
    for (const page of ["-1", "0", "1", "2abc", "1.5", "abc", "9007199254740992"]) {
      assert.equal(back(path, `${path}?page=${page}`, normalize), path);
    }
    assert.equal(back(path, `${path}?page=99999`, normalize), `${path}?page=10000`);
    let received;
    assert.equal(back(path, `${path}?page=9999`, value => { received = value; return 7; }), `${path}?page=7`);
    assert.equal(received, "9999");
  });
}
test("search uses the existing 100-character trimmed limit and only exists for news/programs", () => {
  for (const path of paths) {
    const q = "  " + "한".repeat(101) + "  ";
    const expected = path === paths[0] || path === paths[1] ? `${path}?${new URLSearchParams({ q: "한".repeat(100) })}` : path;
    assert.equal(back(path, `${path}?${new URLSearchParams({ q })}`, normalize), expected);
  }
});
test("encoded query content stays inside allowed parameters, never a destination", () => {
  const q = "//example.com?<script>&#한글";
  const result = back(paths[0], `${paths[0]}?${new URLSearchParams({ q })}`, normalize);
  assert.equal(result, `${paths[0]}?${new URLSearchParams({ q })}`);
});
