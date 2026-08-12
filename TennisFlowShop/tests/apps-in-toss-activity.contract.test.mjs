import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync(new URL("../app/api/apps-in-toss/me/activity/route.ts", import.meta.url), "utf8");
const stepFive = readFileSync(new URL("../../TossMiniApp/src/components/StringingApplicationStepFive.tsx", import.meta.url), "utf8");
const flow = readFileSync(new URL("../../TossMiniApp/src/components/StringingApplicationFlow.tsx", import.meta.url), "utf8");

test("Apps 세션 사용자 소유의 Apps Toss Pay 내역만 읽는다", () => {
  assert.match(route, /authenticateAppsSession/);
  assert.match(route, /userId: authenticated\.user\._id/);
  assert.match(route, /apps_in_toss_toss_pay/);
  assert.doesNotMatch(route, /searchParams|request\.json|payToken|userKey|identityId|transactionId/);
  assert.doesNotMatch(route, /executeApps|finalizeApps|refundApps|updateOne|insertOne|deleteOne/);
});

test("결제 완료 CTA와 pending recovery 우선 정책을 유지한다", () => {
  assert.match(stepFive, /state === "finalized"[\s\S]*내 이용내역 보기/);
  assert.match(flow, /if \(pendingPayment\)[\s\S]*StringingPendingPaymentRecovery/);
});
