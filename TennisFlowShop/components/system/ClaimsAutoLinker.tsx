"use client";

import { useEffect } from "react";

import { useAuthStore } from "@/app/store/authStore";

export default function ClaimsAutoLinker() {
  const { user, authChecked } = useAuthStore();

  useEffect(() => {
    if (!authChecked || !user?.id) return;

    const KEY = `claims:autoLink:done:${user.id}`;
    if (sessionStorage.getItem(KEY)) return;

    (async () => {
      try {
        await fetch("/api/claims/auto-link", {
          method: "POST",
          credentials: "include",
        });
        // 성공/실패 여부와 무관하게 세션당 1회만
      } finally {
        sessionStorage.setItem(KEY, "1");
      }
    })();
  }, [authChecked, user?.id]);

  return null;
}
