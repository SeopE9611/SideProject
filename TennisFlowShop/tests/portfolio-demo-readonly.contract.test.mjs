import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

function read(relPath) {
  return readFileSync(join(REPO_ROOT, relPath), "utf8");
}

test("Portfolio Demo 관리자 mutation은 공통 서버 경계에서 일관된 403 응답으로 차단된다", () => {
  const helper = read("lib/admin/portfolio-demo-readonly.server.ts");
  const csrf = read("lib/admin/verifyAdminCsrf.ts");

  assert.ok(helper.includes('import "server-only"'));
  assert.ok(helper.includes('process.env.PORTFOLIO_DEMO_MODE === "true"'));
  assert.ok(helper.includes('new Set(["POST", "PUT", "PATCH", "DELETE"])'));
  assert.ok(helper.includes('code: "PORTFOLIO_DEMO_READ_ONLY"'));
  assert.ok(helper.includes('message: "포트폴리오 데모에서는 조회만 가능합니다."'));
  assert.ok(helper.includes('{ status: 403 }'));
  assert.ok(csrf.includes("getPortfolioDemoAdminMutationBlock(req)"));
  assert.ok(
    csrf.indexOf("getPortfolioDemoAdminMutationBlock(req)") <
      csrf.indexOf("const originAllowlist = buildOriginAllowlist()"),
    "Demo 차단 이후 Production의 기존 CSRF 검사가 이어져야 합니다.",
  );
});

test("공통 CSRF를 사용하지 않는 boards 관리자 mutation도 Demo 보호를 적용한다", () => {
  const createRoute = read("app/api/boards/route.ts");
  const itemRoute = read("app/api/boards/[id]/route.ts");
  const answerRoute = read("app/api/boards/[id]/answer/route.ts");

  assert.ok(createRoute.includes("getPortfolioDemoAdminMutationBlock(req)"));
  assert.equal(itemRoute.match(/else if \(isPortfolioDemoReadOnly\(\)\)/g)?.length, 2);
  assert.equal(itemRoute.match(/getPortfolioDemoAdminMutationBlock\(req\)/g)?.length, 4);
  assert.equal(answerRoute.match(/getPortfolioDemoAdminMutationBlock\(/g)?.length, 3);
});

test("관리자 공통 레이아웃은 서버 환경값으로 Demo 조회 전용 안내를 조건부 렌더링한다", () => {
  const layout = read("app/admin/layout.tsx");

  assert.ok(layout.includes("isPortfolioDemoReadOnly()"));
  assert.ok(layout.includes("{isDemoReadOnly ? ("));
  assert.ok(layout.includes("포트폴리오 데모 · 조회 전용"));
  assert.ok(
    layout.includes(
      "실제 운영 환경과 분리된 시연용 데이터입니다. 등록·수정·삭제 등 변경 작업은",
    ),
  );
});

test("Storage와 Seed 및 고객·PG 관리자 CSRF 경계는 변경 대상이 아니다", () => {
  const storage = read("lib/storage-config.server.ts");
  const seed = read("scripts/db/seed-portfolio-demo.mjs");
  const customerPayment = read("app/api/payments/toss/confirm/route.ts");

  assert.ok(storage.includes("IS_PORTFOLIO_DEMO"));
  assert.ok(seed.length > 0);
  assert.ok(!customerPayment.includes("verifyAdminCsrf"));
});
