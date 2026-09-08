import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Module from "node:module";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");

function compileTs(path, stubs = {}) {
  const { outputText } = ts.transpileModule(read(path), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const filename = join(
    mkdtempSync(join(tmpdir(), "portfolio-demo-")),
    path.replaceAll("/", "_") + ".cjs",
  );
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(process.cwd());
  const originalRequire = mod.require.bind(mod);
  mod.require = (id) => (id in stubs ? stubs[id] : originalRequire(id));
  mod._compile(outputText, filename);
  return mod.exports;
}

const interactive = compileTs("lib/portfolio-demo/interactive.server.ts", {
  "server-only": {},
});

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
  const demoGuardIndex = route.indexOf("if (!isPortfolioDemo())");
  const rateLimitIndex = route.indexOf("enforcePublicAuthRateLimit({");
  const cleanupIndex = route.indexOf("cleanupExpiredPortfolioDemoInteractions(db)");
  assert.ok(demoGuardIndex >= 0 && demoGuardIndex < rateLimitIndex);
  assert.ok(rateLimitIndex < cleanupIndex);
  assert.match(route, /routeId: "portfolio_demo_session"/);
  assert.match(route, /role: "user"/);
  assert.match(route, /createPortfolioDemoInteractionMeta\(demoSessionId, now\)/);
  assert.match(route, /portfolio-demo-\$\{suffix\}@example\.com/);
  assert.ok(route.includes('response.cookies.set("accessToken"'));
  assert.ok(route.includes('response.cookies.set("refreshToken"'));
});

test("Demo session rate limit은 기존 Public Auth 정책과 429 계약을 재사용한다", () => {
  const rateLimit = read("lib/auth/publicAuthRateLimit.ts");
  assert.match(rateLimit, /\| "portfolio_demo_session"/);
  assert.match(rateLimit, /portfolio_demo_session:\s*\{\s*ip: \{ limit: 10, windowSec: 60 \* 10 \}/);
  assert.match(rateLimit, /function buildTooManyRequestsResponse/);
});

test("Demo 전화번호는 UUID hex 문자와 관계없이 010으로 시작하는 11자리 숫자다", () => {
  for (const sessionId of [
    "abcdefab-cdef-abcd-efab-cdefabcdefab",
    "123e4567-e89b-12d3-a456-426614174000",
  ]) {
    const phone = interactive.buildPortfolioDemoPhone(sessionId);
    assert.match(phone.replace(/\D/g, ""), /^010\d{8}$/);
  }
});

test("Demo access/refresh TTL은 Interaction 24시간을 초과하지 않는다", () => {
  assert.equal(interactive.PORTFOLIO_DEMO_INTERACTION_TTL_SECONDS, 24 * 60 * 60);
  assert.equal(interactive.capPortfolioDemoTokenMaxAge(60 * 60), 60 * 60);
  assert.equal(interactive.capPortfolioDemoTokenMaxAge(60 * 60 * 24 * 7), 60 * 60 * 24);
  const route = read("app/api/portfolio-demo/session/route.ts");
  assert.match(route, /expiresIn: accessMaxAge/);
  assert.match(route, /expiresIn: refreshMaxAge/);
  assert.match(route, /maxAge: accessMaxAge/);
  assert.match(route, /maxAge: refreshMaxAge/);
});

test("Demo remaining TTL은 저장된 절대 만료 시각을 기준으로 floor 계산한다", () => {
  const startedAt = new Date("2026-09-08T12:00:00.000Z");
  const { demoExpiresAt } = interactive.createPortfolioDemoInteractionMeta("session", startedAt);
  assert.equal(
    interactive.getPortfolioDemoRemainingSessionSeconds(demoExpiresAt, startedAt),
    24 * 60 * 60,
  );
  assert.equal(
    interactive.getPortfolioDemoRemainingSessionSeconds(
      demoExpiresAt,
      new Date("2026-09-09T11:00:00.000Z"),
    ),
    60 * 60,
  );
  assert.equal(
    interactive.getPortfolioDemoRemainingSessionSeconds(
      demoExpiresAt,
      new Date("2026-09-09T11:59:58.750Z"),
    ),
    1,
  );
  assert.equal(interactive.getPortfolioDemoRemainingSessionSeconds(demoExpiresAt, demoExpiresAt), 0);
  assert.equal(interactive.getPortfolioDemoRemainingSessionSeconds("invalid date", startedAt), 0);
  assert.equal(interactive.getPortfolioDemoRemainingSessionSeconds(undefined, startedAt), 0);
});

test("Demo refresh는 남은 절대 TTL로 제한하고 일반 사용자의 기존 TTL은 유지한다", () => {
  const remainingSeconds = 30 * 60;
  assert.equal(Math.min(60 * 60, remainingSeconds), remainingSeconds);
  assert.equal(Math.min(60 * 60 * 24 * 7, remainingSeconds), remainingSeconds);

  const route = read("app/api/refresh/route.ts");
  assert.match(route, /let accessMaxAge = ACCESS_TOKEN_EXPIRES_IN/);
  assert.match(route, /let refreshMaxAge = REFRESH_TOKEN_EXPIRES_IN/);
  assert.match(route, /user\.isDemoInteraction === true/);
  assert.match(route, /getPortfolioDemoRemainingSessionSeconds\(user\.demoExpiresAt\)/);
  assert.match(route, /accessMaxAge = Math\.min\(ACCESS_TOKEN_EXPIRES_IN, remainingSeconds\)/);
  assert.match(route, /refreshMaxAge = Math\.min\(REFRESH_TOKEN_EXPIRES_IN, remainingSeconds\)/);
  assert.match(route, /expiresIn: accessMaxAge/);
  assert.match(route, /expiresIn: refreshMaxAge/);
  assert.match(route, /maxAge: accessMaxAge/);
  assert.match(route, /maxAge: refreshMaxAge/);
});

test("만료되거나 비정상인 Demo refresh는 token 서명 전에 401과 cookie 정리로 종료한다", () => {
  const route = read("app/api/refresh/route.ts");
  const demoGuardIndex = route.indexOf("if (user.isDemoInteraction === true)");
  const expiredReturnIndex = route.indexOf("return demoSessionFailure();", demoGuardIndex);
  const tokenSignIndex = route.indexOf("const newAccessToken = jwt.sign", demoGuardIndex);
  assert.ok(demoGuardIndex >= 0 && demoGuardIndex < expiredReturnIndex);
  assert.ok(expiredReturnIndex < tokenSignIndex);
  assert.match(route, /remainingSeconds <= 0/);
  assert.match(route, /code: "PORTFOLIO_DEMO_SESSION_EXPIRED"/);
  assert.match(route, /\{ status: 401 \}/);
  assert.match(route, /function clearAuthCookies/);
  assert.match(route, /response\.cookies\.set\("accessToken", ""/);
  assert.match(route, /response\.cookies\.set\("refreshToken", ""/);
  assert.match(route, /response\.cookies\.set\(ADMIN_CSRF_COOKIE_KEY, ""/);
});

test("Demo 로그인 UI는 체험 CTA와 이메일 로그인을 유지하고 회원가입 진입을 차단한다", () => {
  const page = read("app/login/page.tsx");
  const client = read("app/login/_components/LoginPageClient.tsx");
  assert.match(page, /registrationPolicy\.allowRegistration && !portfolioDemoMode/);
  assert.match(client, /tabParam === "register" && !allowRegistration \? "login"/);
  assert.match(client, /\{allowRegistration && \(\s*<div className="mb-5/);
  assert.match(client, /\{allowRegistration && \(\s*<RegisterTabPanel/);
  assert.match(client, /고객 데모 체험 시작/);
  assert.match(client, /관리자 데모 보기/);
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


test("Demo switch는 production 차단, same-origin, rate limit 이후에만 세션을 전환한다", () => {
  const route = read("app/api/portfolio-demo/switch/route.ts");
  assert.ok(route.indexOf("if (!isPortfolioDemo())") < route.indexOf("const db = await getDb()"));
  assert.match(route, /if \(!isSameOriginPost\(req\)\)/);
  assert.match(route, /routeId: "portfolio_demo_switch"/);
  assert.match(read("lib/auth/publicAuthRateLimit.ts"), /portfolio_demo_switch:\s*\{\s*ip: \{ limit: 20, windowSec: 60 \* 10 \}/);
});

test("Demo customer만 검증된 Seed Admin Tour로 전환하며 credential을 사용하지 않는다", () => {
  const route = read("app/api/portfolio-demo/switch/route.ts");
  assert.match(route, /currentUser\.role !== "user"/);
  assert.match(route, /currentUser\.isDemoInteraction !== true/);
  assert.match(route, /remainingSeconds <= 0/);
  assert.match(route, /demoSeedKey: PORTFOLIO_DEMO_ADMIN_SEED_KEY/);
  assert.match(route, /isDemoData: true/);
  assert.match(route, /isAdminRole\(admin\.role\)/);
  assert.match(route, /portfolioDemoTour: true/);
  assert.doesNotMatch(route, /PORTFOLIO_DEMO_ADMIN_(?:EMAIL|PASSWORD)/);
});

test("Admin Tour refresh는 원래 customer context와 absolute TTL을 유지하며 fail-closed 한다", () => {
  const route = read("app/api/refresh/route.ts");
  const tourStart = route.indexOf("if (decoded.portfolioDemoTour === true)");
  const normalStart = route.indexOf("if (typeof decoded.sub", tourStart);
  assert.ok(tourStart >= 0 && normalStart > tourStart);
  const tourBranch = route.slice(tourStart, normalStart);
  assert.match(tourBranch, /getPortfolioDemoTourContext/);
  assert.match(tourBranch, /customer\.demoSessionId !== context\.demoSessionId/);
  assert.match(tourBranch, /portfolioDemoExpiryMatches\(customer\.demoExpiresAt, context\.demoExpiresAt\)/);
  assert.match(tourBranch, /demoSessionFailure\(\)/);
  assert.match(tourBranch, /demoExpiresAt: context\.demoExpiresAt/);
  assert.match(tourBranch, /Math\.min\(REFRESH_TOKEN_EXPIRES_IN, remainingSeconds\)/);
});

test("customer 복귀는 Tour context를 제거하고 admin CSRF를 삭제한다", () => {
  const route = read("app/api/portfolio-demo/switch/route.ts");
  assert.match(route, /getPortfolioDemoTourContext/);
  assert.match(route, /customer\.demoSessionId !== context\.demoSessionId/);
  assert.match(route, /portfolioDemoExpiryMatches/);
  assert.match(route, /jwt\.sign\(\{ sub: user\._id\.toString\(\) \}, REFRESH_TOKEN_SECRET/);
  assert.match(route, /ADMIN_CSRF_COOKIE_KEY, "", \{ \.\.\.baseCookie, httpOnly: false, maxAge: 0 \}/);
});

test("users/me는 Demo 여부 boolean만 노출하고 내부 context는 노출하지 않는다", () => {
  const route = read("app/api/users/me/route.ts");
  const responseStart = route.indexOf("const response = NextResponse.json({");
  const responseEnd = route.indexOf("});", responseStart);
  const response = route.slice(responseStart, responseEnd);
  assert.match(response, /isDemoInteraction: user\.isDemoInteraction === true/);
  assert.doesNotMatch(response, /demoSessionId|demoExpiresAt|demoCustomerSub/);
});
