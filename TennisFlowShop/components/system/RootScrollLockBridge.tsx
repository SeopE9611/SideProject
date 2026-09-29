"use client";

import { recoverStaleNicePayRootScrollGuard } from "@/lib/payments/nice/client-scroll-lock";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * 목적
 * - Radix(react-remove-scroll)가 body에 거는 data-scroll-locked/overflow 변경이 sticky를 깨뜨림
 * - body의 잠금을 html로 "이관"해서 sticky 기준(overflow)을 흔들지 않게 함
 * - NICE Pay 취소/실패 후 남은 전역 스크롤 잠금을 라우트 전환 시 비상 복구
 */
export default function RootScrollLockBridge() {
  const pathname = usePathname();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const sync = () => {
      const locked = body.hasAttribute("data-scroll-locked");
      html.toggleAttribute("data-scroll-locked", locked);
    };

    sync();

    const mutationObserver = new MutationObserver(sync);

    mutationObserver.observe(body, {
      attributes: true,
      attributeFilter: ["data-scroll-locked"],
    });

    const handlePageShow = () => {
      recoverStaleNicePayRootScrollGuard({
        restoreScrollPosition: false,
      });
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      mutationObserver.disconnect();
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  useEffect(() => {
    recoverStaleNicePayRootScrollGuard({
      restoreScrollPosition: false,
    });
  }, [pathname]);

  return null;
}
