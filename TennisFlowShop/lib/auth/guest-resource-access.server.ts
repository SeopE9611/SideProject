import "server-only";

import {
  hasDedicatedGuestRentalAccess,
  hasGuestOrderAccess,
  hasGuestRentalAccess,
  signRentalAccessToken,
  verifyOrderAccessToken,
  verifyRentalAccessToken,
} from "@/lib/auth.utils";
import { NextResponse } from "next/server";

export const GUEST_ORDER_ACCESS_COOKIE_NAME = "orderAccessToken";
export const GUEST_RENTAL_ACCESS_COOKIE_NAME = "rentalAccessToken";

type CookieStore = { get(name: string): { value: string } | undefined };

export function setGuestRentalAccessCookie(response: NextResponse, rentalId: string) {
  response.cookies.set(
    GUEST_RENTAL_ACCESS_COOKIE_NAME,
    signRentalAccessToken({ scope: "guest_rental", rentalId }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
  );
}

export function getGuestOrderAccessClaims(cookieStore: CookieStore) {
  return verifyOrderAccessToken(cookieStore.get(GUEST_ORDER_ACCESS_COOKIE_NAME)?.value ?? "");
}

export function getGuestRentalAccessClaims(cookieStore: CookieStore) {
  const dedicatedClaims = verifyRentalAccessToken(
    cookieStore.get(GUEST_RENTAL_ACCESS_COOKIE_NAME)?.value ?? "",
  );
  if (dedicatedClaims) return dedicatedClaims;

  const legacyClaims = verifyOrderAccessToken(
    cookieStore.get(GUEST_ORDER_ACCESS_COOKIE_NAME)?.value ?? "",
  );
  return legacyClaims && "rentalId" in legacyClaims ? legacyClaims : null;
}

export function hasGuestOrderCookieAccess(cookieStore: CookieStore, orderId: string) {
  return hasGuestOrderAccess(getGuestOrderAccessClaims(cookieStore), orderId);
}

export function hasGuestRentalCookieAccess(cookieStore: CookieStore, rentalId: string) {
  const dedicatedClaims = verifyRentalAccessToken(
    cookieStore.get(GUEST_RENTAL_ACCESS_COOKIE_NAME)?.value ?? "",
  );
  if (hasDedicatedGuestRentalAccess(dedicatedClaims, rentalId)) return true;

  return hasGuestRentalAccess(
    verifyOrderAccessToken(cookieStore.get(GUEST_ORDER_ACCESS_COOKIE_NAME)?.value ?? ""),
    rentalId,
  );
}
