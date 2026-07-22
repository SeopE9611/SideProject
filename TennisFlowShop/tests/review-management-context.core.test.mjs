import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Module from "node:module";
import ts from "typescript";

const root = new URL("../", import.meta.url);
function compileTs(rel, stubs = {}) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(rel, root), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const filename = join(mkdtempSync(join(tmpdir(), "review-management-")), `${rel}.cjs`);
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(process.cwd());
  const originalRequire = mod.require.bind(mod);
  mod.require = (id) => (id in stubs ? stubs[id] : originalRequire(id));
  mod._compile(outputText, filename);
  return mod.exports;
}
const target = compileTs("lib/reviews/review-target.ts");
const context = compileTs("lib/reviews/review-context.server.ts", { "./review-target": target });

test("후기 context는 canonical/legacy fixture, category, label을 실제 함수로 계산한다", () => {
  assert.equal(target.inferReviewContext({ rentalId: "r1", applicationId: "a1" }), "rental_stringing");
  assert.equal(target.inferReviewContext({ orderId: "o1", serviceApplicationId: "a1" }), "product_stringing");
  assert.equal(target.inferReviewContext({ service: "stringing" }), "standalone_stringing");
  assert.equal(target.getReviewManagementCategory("rental_stringing"), "rental");
  assert.equal(target.getReviewContextLabel("product_stringing"), "상품·교체서비스 후기");
});

test("관리 Mongo context expression은 다섯 canonical context와 legacy fallback을 반환한다", () => {
  const expr = context.buildResolvedReviewContextExpression();
  assert.deepEqual(expr.$switch.branches[0].case.$in[1], ["product", "product_stringing", "standalone_stringing", "rental", "rental_stringing"]);
  assert.equal(expr.$switch.branches[1].then, "rental_stringing");
  assert.equal(expr.$switch.default, "product");
});
