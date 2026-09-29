import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

function read(relPath) {
  return readFileSync(join(REPO_ROOT, relPath), "utf8");
}

const DIRECT_ADMIN_MUTATION_ROUTES = [
  "app/api/messages/admin/route.ts",
  "app/api/applications/[id]/status/route.ts",
  "app/api/orders/[id]/cancel-reject/route.ts",
  "app/api/orders/[id]/cancel-approve/route.ts",
  "app/api/applications/stringing/[id]/payment-sync/route.ts",
  "app/api/service-pass/[id]/extend/route.ts",
];

const MIXED_OWNER_ADMIN_MUTATION_ROUTES = [
  "app/api/orders/[id]/route.ts",
  "app/api/orders/[id]/cancel-request/route.ts",
  "app/api/orders/[id]/cancel-request-withdraw/route.ts",
  "app/api/applications/stringing/[id]/route.ts",
  "app/api/applications/stringing/[id]/shipping/route.ts",
  "app/api/messages/send/route.ts",
];

test("Portfolio Demo 관리자 mutation은 공통 서버 경계에서 일관된 403 응답으로 차단된다", () => {
  const helper = read("lib/admin/portfolio-demo-readonly.server.ts");
  const csrf = read("lib/admin/verifyAdminCsrf.ts");

  assert.match(helper, /PORTFOLIO_DEMO_MODE\s*===\s*["']true["']/);
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    assert.ok(helper.includes(`"${method}"`), `${method}: 관리자 mutation 차단 대상이어야 합니다.`);
  }
  assert.match(helper, /code:\s*["']PORTFOLIO_DEMO_READ_ONLY["']/);
  assert.match(helper, /status:\s*403/);
  assert.ok(csrf.includes("getPortfolioDemoAdminMutationBlock(req)"));
  assert.ok(
    csrf.indexOf("getPortfolioDemoAdminMutationBlock(req)") <
      csrf.indexOf("const originAllowlist = buildOriginAllowlist()"),
    "Demo mutation은 기존 CSRF 검사 및 write 진입 전에 차단되어야 합니다.",
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

test("비 /api/admin namespace의 관리자 전용 mutation도 Demo 보호를 적용한다", () => {
  for (const relPath of DIRECT_ADMIN_MUTATION_ROUTES) {
    const route = read(relPath);
    assert.ok(
      route.includes("getPortfolioDemoAdminMutationBlock("),
      `${relPath}: 관리자 인증 직후 Demo mutation guard가 필요합니다.`,
    );
  }
});

test("owner/admin 혼합 mutation은 admin branch만 Demo 보호를 적용한다", () => {
  for (const relPath of MIXED_OWNER_ADMIN_MUTATION_ROUTES) {
    const route = read(relPath);
    assert.ok(
      /if \((?:auth\.)?isAdmin\)|if \(isFromAdmin\)/.test(route),
      `${relPath}: 관리자 분기를 명시적으로 구분해야 합니다.`,
    );
    assert.ok(
      /if \((?:auth\.)?isAdmin\) \{\s*const demoMutationBlock = getPortfolioDemoAdminMutationBlock\(|if \(isFromAdmin\) \{\s*const demoMutationBlock = getPortfolioDemoAdminMutationBlock\(/.test(
        route,
      ),
      `${relPath}: Demo guard는 일반 owner flow가 아닌 관리자 조건문 내부에 있어야 합니다.`,
    );
  }
});

test("stringing legacy/direct 관리자 mutation handler도 우회할 수 없다", () => {
  const handlers = read("app/features/stringing-applications/api/handlers.ts");
  const guardedHandlers = [
    "handleUpdateApplicationStatus",
    "handleStringingCancelApprove",
    "handleStringingAdminCancel",
    "handleStringingCancelReject",
    "handleApplicationCancelApprove",
    "handleApplicationCancelReject",
  ];

  for (const [index, handlerName] of guardedHandlers.entries()) {
    const start = handlers.indexOf(`export async function ${handlerName}`);
    const nextName = guardedHandlers[index + 1];
    const next = nextName ? handlers.indexOf(`export async function ${nextName}`, start + 1) : -1;
    const handler = handlers.slice(start, next > start ? next : undefined);
    assert.ok(start >= 0, `${handlerName}: handler가 존재해야 합니다.`);
    assert.ok(
      handler.includes("getPortfolioDemoAdminMutationBlock(req)"),
      `${handlerName}: 인증된 관리자 write 전에 Demo guard가 필요합니다.`,
    );
  }
});

test("일반 고객·PG route에는 관리자 전용 CSRF/Demo guard를 적용하지 않는다", () => {
  const customerPayment = read("app/api/payments/toss/confirm/route.ts");

  assert.ok(!customerPayment.includes("verifyAdminCsrf"));
  assert.ok(!customerPayment.includes("getPortfolioDemoAdminMutationBlock"));
});
