import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("비회원 주문·대여 접근 토큰 교차 경계 계약", () => {
  const auth = read("lib/auth.utils.ts");
  const helper = read("lib/auth/guest-resource-access.server.ts");
  const rentals = read("app/api/rentals/route.ts");
  const guestToken = read("app/api/rentals/[id]/guest-token/route.ts");
  const niceReturn = read("app/api/payments/nice/rental/return/route.ts");
  const rentalAccess = read("app/api/rentals/_lib/rental-access.ts");
  const byOrder = read("app/api/applications/stringing/by-order/[orderId]/route.ts");
  const byRental = read("app/api/applications/stringing/by-rental/[rentalId]/route.ts");
  const gate = read("app/api/applications/stringing/_helpers/access-gate.ts");
  const success = read("app/services/success/page.tsx");
  const shipping = read("app/api/applications/stringing/[id]/shipping/route.ts");

  assert.match(auth, /GuestRentalAccessTokenPayload/);
  assert.match(auth, /scope: "guest_rental"/);
  assert.match(auth, /signRentalAccessToken/);
  assert.match(auth, /verifyRentalAccessToken/);
  assert.match(auth, /hasGuestOrderAccess/);
  assert.match(auth, /"orderId" in claims/);
  assert.match(helper, /rentalAccessToken/);
  assert.match(helper, /setGuestRentalAccessCookie/);
  assert.match(helper, /verifyRentalAccessToken[\s\S]*verifyOrderAccessToken/);
  for (const source of [rentals, guestToken, niceReturn]) {
    assert.match(source, /setGuestRentalAccessCookie/);
    assert.doesNotMatch(source, /signOrderAccessToken\(\{ rentalId/);
  }
  assert.match(rentalAccess, /hasGuestRentalCookieAccess/);
  assert.match(byOrder, /hasGuestOrderCookieAccess/);
  assert.match(byRental, /hasGuestRentalCookieAccess/);
  assert.match(gate, /guestOrderClaims/);
  assert.match(gate, /guestRentalClaims/);
  assert.match(success, /ownerRentalId/);
  assert.match(success, /hasGuestRentalCookieAccess/);
  assert.doesNotMatch(shipping, /rentalAccessToken/);
  assert.doesNotMatch(auth, /guestRentalLookupToken/);
});
