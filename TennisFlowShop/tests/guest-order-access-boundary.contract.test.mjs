import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const detailDto = read("app/api/guest-orders/_lib/guest-order-response.ts");
const detailPage = read("app/order-lookup/details/[id]/page.tsx");
const trackingRoute = read("app/api/guest-orders/[id]/tracking/route.ts");
const guestTokenRoute = read("app/api/orders/[id]/guest-token/route.ts");
const authUtils = read("lib/auth.utils.ts");
const lookupRoute = read("app/api/guest-orders/lookup/route.ts");
const detailRoute = read("app/api/guest-orders/[id]/route.ts");

assert.match(authUtils, /signGuestOrderLookupAccessToken/);
assert.match(authUtils, /OBJECT_ID_TEXT_RE\s*=\s*\/\^\[a-f0-9\]\{24\}\$\/i/);
assert.match(authUtils, /normalizeGuestOrderLookupOrderIds/);
assert.match(authUtils, /OBJECT_ID_TEXT_RE\.test\(normalizedOrderId\)/);

assert.doesNotMatch(detailDto, /Number\(order\.totalPrice\s*\?\?\s*0\)/);
assert.match(detailDto, /toNullableFiniteNumber/);
assert.match(detailPage, /totalPrice:\s*number\s*\|\s*null/);
assert.match(detailPage, /typeof order\.totalPrice === "number"/);

assert.match(trackingRoute, /ORDER_NOT_AVAILABLE/);
assert.doesNotMatch(trackingRoute, /error:\s*"권한이 없습니다\."\s*}\s*,\s*\{ status: 403 \}/);
assert.match(guestTokenRoute, /ORDER_NOT_AVAILABLE/);
assert.doesNotMatch(guestTokenRoute, /invalid order id/);
assert.doesNotMatch(guestTokenRoute, /status:\s*400/);

assert.match(lookupRoute, /name:\s*z\.string\(\)\.trim\(\)\.min\(1/);
assert.match(lookupRoute, /guestOrderLookupToken/);
assert.doesNotMatch(detailRoute, /\.\.\.order/);
assert.match(detailRoute, /hasGuestOrderLookupAccess/);
assert.match(guestTokenRoute, /hasGuestOrderLookupAccess/);
assert.doesNotMatch(lookupRoute, /searchParams\.get\("(?:name|email|phone)"\)/);

const changedFiles = new Set(
  execFileSync("git", ["diff", "--name-only", "HEAD"], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean),
);
assert.equal(
  [...changedFiles].some((file) => /(^|\/)(rental|rental_orders)(\/|$)/.test(file)),
  false,
  "rental 관련 파일은 이 변경에 포함되면 안 됩니다.",
);
