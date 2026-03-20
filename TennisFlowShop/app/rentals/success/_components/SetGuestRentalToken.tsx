"use client";

import { useEffect } from "react";

/** 비회원(게스트) 대여라면, 마운트 시 대여 접근 전용 토큰(HttpOnly 쿠키)을 서버에 요청해 심는다. */
export default function SetGuestRentalToken({
  rentalId,
  isGuest,
}: {
  rentalId: string;
  isGuest: boolean;
}) {
  useEffect(() => {
    if (!isGuest || !rentalId) return;
    (async () => {
      try {
        await fetch(`/api/rentals/${rentalId}/guest-token`, {
          method: "POST",
          credentials: "include",
        });
      } catch (e) {
        console.error("[guest-rental-token] failed", e);
      }
    })();
  }, [rentalId, isGuest]);

  return null;
}
