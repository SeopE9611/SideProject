import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("비회원 대여 접근 경계 계약", () => {
  const auth = read("lib/auth.utils.ts");
  const rentals = read("app/api/rentals/route.ts");
  const guestToken = read("app/api/rentals/[id]/guest-token/route.ts");
  const detail = read("app/api/rentals/[id]/route.ts");
  const prepare = read("app/api/rentals/[id]/prepare/route.ts");
  const cancelRequest = read("app/api/rentals/[id]/cancel-request/route.ts");
  const niceReturn = read("app/api/payments/nice/rental/return/route.ts");
  const success = read("app/rentals/success/page.tsx");

  assert.match(auth, /hasGuestRentalAccess/);
  assert.match(auth, /signRentalAccessToken/);
  assert.match(auth, /verifyRentalAccessToken/);
  assert.match(rentals, /setGuestRentalAccessCookie/);
  assert.match(guestToken, /hasGuestRentalCookieAccess/);
  assert.match(guestToken, /setGuestRentalAccessCookie/);
  for (const source of [detail, prepare, cancelRequest, guestToken]) {
    assert.match(source, /RENTAL_NOT_AVAILABLE|rentalNotAvailable/);
  }
  assert.match(niceReturn, /redirectToRentalSuccess/);
  assert.match(success, /hasGuestRentalCookieAccess/);
  assert.doesNotMatch(auth, /guestRentalLookupToken/);
  assert.doesNotMatch(guestToken, /guestOrderLookupToken/);
});
