import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync(new URL("../app/api/apps-in-toss/me/activity/route.ts", import.meta.url), "utf8");
const stepFive = readFileSync(new URL("../../TossMiniApp/src/components/StringingApplicationStepFive.tsx", import.meta.url), "utf8");
const flow = readFileSync(new URL("../../TossMiniApp/src/components/StringingApplicationFlow.tsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../../TossMiniApp/src/App.tsx", import.meta.url), "utf8");
const activity = readFileSync(new URL("../../TossMiniApp/src/components/ActivityScreen.tsx", import.meta.url), "utf8");
const recovery = readFileSync(new URL("../../TossMiniApp/src/components/StringingPendingPaymentRecovery.tsx", import.meta.url), "utf8");
const marker = readFileSync(new URL("../../TossMiniApp/src/lib/pending-payment.ts", import.meta.url), "utf8");

test("Apps 세션 사용자 소유의 Apps Toss Pay 내역만 읽는다", () => {
  assert.match(route, /authenticateAppsSession/);
  assert.match(route, /userId: authenticated\.user\._id/);
  assert.match(route, /apps_in_toss_toss_pay/);
  assert.doesNotMatch(route, /searchParams|request\.json|payToken|userKey|identityId|transactionId/);
  assert.doesNotMatch(route, /executeApps|finalizeApps|refundApps|updateOne|insertOne|deleteOne/);
  assert.match(route, /error instanceof AppsInTossSessionError[\s\S]*401/);
  assert.match(route, /이용내역을 불러오지 못했습니다[\s\S]*500/);
  assert.doesNotMatch(route, /password|phone|email|payToken|sessionToken|identityId|transactionId/);
  assert.match(activity, /error instanceof ApiError && error\.status === 401[\s\S]*auth\.clearSession\(\)/);
});

test("App 최상위 pending recovery가 모든 일반 route보다 우선한다", () => {
  assert.match(stepFive, /state === "finalized"[\s\S]*내 이용내역 보기/);
  assert.match(app, /useState<PendingAppsPayment \| null>\(\(\) => readPendingAppsPayment\(\)\)/);
  assert.match(app, /handlePopState[\s\S]*setPendingPayment\(readPendingAppsPayment\(\)\)/);
  const pendingBranch = app.indexOf("if (pendingPayment)");
  assert.ok(pendingBranch >= 0);
  for (const generalRoute of ["if (isActivity)", "if (selectedProductId && isStringingCheckout)", "if (selectedProductId)"]) {
    assert.ok(pendingBranch < app.indexOf(generalRoute), `pending recovery must precede ${generalRoute}`);
  }
  assert.match(app, /<StringingPendingPaymentRecovery pending=\{pendingPayment\} onResolved=\{handlePendingPaymentResolved\}/);
  assert.doesNotMatch(app + recovery, /prepareAppsPayment|checkoutPayment/);
  assert.match(flow, /if \(pendingPayment\)[\s\S]*StringingPendingPaymentRecovery/);
  for (const handler of ["handleApplicantChange", "handleCollectionMethodChange", "handleShippingChange", "handleWorkChange"]) {
    assert.match(flow, new RegExp(`const ${handler} =[\\s\\S]*?readPendingAppsPayment\\(\\);[\\s\\S]*?setPendingPayment\\(pending\\); return;`));
  }
  assert.match(marker, /type PendingAppsPayment = \{ attemptId: string; authorizedAt: string \}/);
  assert.match(marker, /Object\.keys\(value\)\.sort\(\)\.join\(","\) !== "attemptId,authorizedAt"/);
  assert.doesNotMatch(marker, /payToken|sessionToken|productId|applicant|shipping|work/);
});
