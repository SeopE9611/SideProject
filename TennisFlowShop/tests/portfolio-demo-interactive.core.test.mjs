import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");

test("interaction metadata와 cleanup 경계가 24시간 및 seed 제외 계약을 갖는다", () => {
  const helper = read("lib/portfolio-demo/interactive.server.ts");
  assert.match(helper, /24 \* 60 \* 60 \* 1000/);
  assert.match(helper, /isDemoInteraction: true/);
  assert.match(helper, /demoExpiresAt: \{ \$lte: now \}/);
  assert.match(helper, /demoSeedKey: \{ \$exists: false \}/);
  assert.match(helper, /if \(!isPortfolioDemo\(\)\) return \{ deletedCount: 0 \}/);
});

test("Demo session은 격리 사용자와 정상 access/refresh cookie를 발급한다", () => {
  const route = read("app/api/portfolio-demo/session/route.ts");
  assert.match(route, /if \(!isPortfolioDemo\(\)\).*status: 404/);
  assert.match(route, /role: "user"/);
  assert.match(route, /createPortfolioDemoInteractionMeta\(demoSessionId\)/);
  assert.match(route, /portfolio-demo-\$\{suffix\}@example\.com/);
  assert.ok(route.includes('response.cookies.set("accessToken"'));
  assert.ok(route.includes('response.cookies.set("refreshToken"'));
});

test("Demo 업무 문서는 metadata를 저장하고 재고·pass 소비를 보존한다", () => {
  for (const path of [
    "app/features/orders/api/handlers.ts",
    "app/features/stringing-applications/api/submit-core.ts",
    "app/features/rentals/api/create-rental-order-core.ts",
    "app/api/packages/orders/route.ts",
    "app/api/academy/applications/route.ts",
  ]) assert.ok(read(path).includes("createPortfolioDemoInteractionMeta"), path);
  assert.ok(read("app/features/orders/api/handlers.ts").includes("shouldPreservePortfolioDemoInventory"));
  const stringing = read("app/features/stringing-applications/api/submit-core.ts");
  assert.match(stringing, /shouldPreservePortfolioDemoInventory\(\).*status: "preserved"/);
  assert.match(stringing, /packageUsage\.usingPackage && !shouldPreservePortfolioDemoInventory\(\)/);
});

test("외부 알림 및 결제 provider는 Demo에서 호출 전에 중단한다", () => {
  assert.match(read("lib/admin-alerts/sendAdminOperationalAlert.ts"), /skipped:portfolio-demo/);
  for (const path of ["lib/payments/toss/server.ts", "lib/payments/nice/server.ts", "lib/apps-in-toss/server/toss-pay-client.ts"]) {
    const source = read(path);
    assert.match(source, /PORTFOLIO_DEMO_MODE/);
    assert.match(source, /PORTFOLIO_DEMO_PAYMENT_DISABLED/);
  }
});
