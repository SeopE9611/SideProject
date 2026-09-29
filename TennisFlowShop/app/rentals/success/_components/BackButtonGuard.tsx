"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BackButtonGuard() {
  const router = useRouter();

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);

    const onPopState = () => {
      router.replace("/");
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [router]);

  return null;
}
