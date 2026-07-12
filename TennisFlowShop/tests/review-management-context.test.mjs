import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Module from "node:module";
import ts from "typescript";

const root = new URL("../", import.meta.url);

function compileTs(rel, stubs = {}) {
  const src = readFileSync(new URL(rel, root), "utf8");
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const filename = join(mkdtempSync(join(tmpdir(), "review-management-")), rel.replaceAll("/", "_") + ".cjs");
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(process.cwd());
  const originalRequire = mod.require.bind(mod);
  mod.require = (id) => (id in stubs ? stubs[id] : originalRequire(id));
  mod._compile(outputText, filename);
  return mod.exports;
}

const target = compileTs("lib/reviews/review-target.ts");
const contextServer = compileTs("lib/reviews/review-context.server.ts", { "./review-target": target });

const cases = [
  [{ reviewContext: "product" }, "product"],
  [{ reviewContext: "product_stringing" }, "product_stringing"],
  [{ reviewContext: "standalone_stringing" }, "standalone_stringing"],
  [{ reviewContext: "rental" }, "rental"],
  [{ reviewContext: "rental_stringing" }, "rental_stringing"],
  [{ rentalId: "r1", serviceApplicationId: "a1" }, "rental_stringing"],
  [{ rentalId: "r1", applicationId: "a1" }, "rental_stringing"],
  [{ orderId: "o1", serviceApplicationId: "a1" }, "product_stringing"],
  [{ rentalId: "r1" }, "rental"],
  [{ reviewType: "rental" }, "rental"],
  [{ service: "stringing" }, "standalone_stringing"],
  [{ reviewType: "service" }, "standalone_stringing"],
  [{ rentalId: "" }, "product"],
  [{ rentalId: "   " }, "product"],
  [{ applicationId: "" }, "product"],
  [{ orderId: "", service: "stringing" }, "standalone_stringing"],
  [{ rentalId: "000000000000000000000001" }, "rental"],
  [{ serviceApplicationId: "000000000000000000000002" }, "standalone_stringing"],
  [{}, "product"],
];

test("공통 inferReviewContext가 canonical 및 legacy fixture를 판정한다", () => {
  for (const [input, expected] of cases) assert.equal(target.inferReviewContext(input), expected);
});

test("관리용 category는 주 거래 대상 기준으로 상호 배타적이다", () => {
  assert.equal(target.getReviewManagementCategory("product"), "product");
  assert.equal(target.getReviewManagementCategory("product_stringing"), "product");
  assert.equal(target.getReviewManagementCategory("standalone_stringing"), "stringing");
  assert.equal(target.getReviewManagementCategory("rental"), "rental");
  assert.equal(target.getReviewManagementCategory("rental_stringing"), "rental");
});

test("5개 context label을 정확히 반환한다", () => {
  assert.equal(target.getReviewContextLabel("product"), "상품 후기");
  assert.equal(target.getReviewContextLabel("product_stringing"), "상품·교체서비스 후기");
  assert.equal(target.getReviewContextLabel("standalone_stringing"), "교체서비스 후기");
  assert.equal(target.getReviewContextLabel("rental"), "대여 후기");
  assert.equal(target.getReviewContextLabel("rental_stringing"), "대여·교체서비스 후기");
});

test("Mongo resolved context expression 계약을 유지한다", () => {
  const expr = contextServer.buildResolvedReviewContextExpression();
  assert.deepEqual(expr.$switch.branches[0].case.$in[1], [
    "product",
    "product_stringing",
    "standalone_stringing",
    "rental",
    "rental_stringing",
  ]);
  assert.equal(expr.$switch.branches[0].then, "$reviewContext");
  assert.equal(expr.$switch.branches[1].then, "rental_stringing");
  assert.equal(expr.$switch.branches[2].then, "product_stringing");
  assert.equal(expr.$switch.branches[3].then, "rental");
  assert.equal(expr.$switch.branches[4].then, "standalone_stringing");
  assert.equal(expr.$switch.default, "product");
  assert.ok(JSON.stringify(expr).includes("$trim"));
  assert.ok(JSON.stringify(expr).includes("$strLenCP"));
});

test("관리 API/UI와 마이페이지 API/UI가 context 관리 계약을 포함한다", () => {
  const mineApi = readFileSync(new URL("app/api/reviews/mine/route.ts", root), "utf8");
  assert.ok(mineApi.includes("resolvedReviewContext"));
  assert.ok(mineApi.includes("category"));
  assert.ok(mineApi.includes("rentalId"));
  assert.ok(mineApi.includes("orderId"));
  assert.ok(mineApi.includes("serviceApplicationIdResolved"));
  assert.ok(mineApi.includes("relatedProductIds"));
  assert.ok(mineApi.includes("relatedRacketIds"));
  assert.ok(mineApi.indexOf("contextCategoryMatch") < mineApi.indexOf("$limit: limit + 1"));
  assert.ok(mineApi.includes('then: "rental"') && mineApi.includes('then: "stringing"'));

  const mypage = readFileSync(new URL("app/mypage/tabs/ReviewList.tsx", root), "utf8");
  assert.ok(mypage.includes("ReviewContextBadge"));
  assert.ok(!mypage.includes('"product" | "service"'));
  assert.ok(mypage.includes('category: categoryFilter'));
  assert.ok(mypage.includes("거래 상세보기"));
  assert.ok(mypage.includes("후기 수정"));

  const adminApi = readFileSync(new URL("app/api/admin/reviews/route.ts", root), "utf8");
  assert.ok(adminApi.includes("context: z.enum"));
  assert.ok(adminApi.includes("resolvedReviewContext"));
  assert.ok(adminApi.indexOf("resolvedReviewContext") < adminApi.indexOf("$skip"));
  assert.ok(adminApi.includes('$count: "total"'));

  const metrics = readFileSync(new URL("app/api/admin/reviews/metrics/route.ts", root), "utf8");
  assert.ok(metrics.includes("byContext"));
  assert.ok(metrics.includes("byCategory"));

  const detail = readFileSync(new URL("app/api/admin/reviews/[id]/route.ts", root), "utf8");
  assert.ok(detail.includes("shapeAdminReview"));

  const adminUi = readFileSync(new URL("app/admin/reviews/_components/AdminReviewListClient.tsx", root), "utf8");
  assert.ok(adminUi.includes("ReviewContextBadge"));
  assert.ok(adminUi.includes("전체 상태"));
  assert.ok(adminUi.includes("대여·교체서비스 후기"));
  assert.ok(adminUi.includes("유형별 후기"));
  assert.ok(adminUi.includes("/admin/orders/"));
  assert.ok(adminUi.includes("후기 상세"));
});
