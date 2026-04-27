"use client";

import type React from "react";
import { usePathname } from "next/navigation";

import SideMenu from "@/components/nav/SideMenu";
import { cn } from "@/lib/utils";

/**
 * 입력/결제/인증/주문조회 등 "집중 플로우" 화면에서는
 * 글로벌 SideMenu를 숨기고, 좌측 padding(pl)도 제거
 */
const HIDE_SIDEMENU_PREFIXES = [
  "/mypage",
  "/admin",
  "/checkout",
  "/services/apply",
  "/order-lookup",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/account/password",
];

const HIDE_SIDEMENU_EXACT_PATHS = new Set([
  "/services/packages/checkout",
  "/services/packages/success",
  "/services/packages/nice/fail",
  "/services/packages/toss/fail",
  "/services/packages/toss/success",
  "/rentals/success",
  "/rentals/nice/fail",
  "/rackets/nice/fail",
  "/rackets/toss/fail",
  "/rackets/toss/success",
]);

const HIDE_SIDEMENU_PATTERNS = [/^\/rentals\/[^/]+\/checkout$/];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const hideSideMenu =
    HIDE_SIDEMENU_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ) ||
    HIDE_SIDEMENU_EXACT_PATHS.has(pathname) ||
    HIDE_SIDEMENU_PATTERNS.some((pattern) => pattern.test(pathname));

  const showSideMenu = !hideSideMenu;

  return (
    <>
      {showSideMenu && <SideMenu />}

      <main
        id="main"
        className="flex-1"
        style={{ paddingTop: "var(--header-h, 0px)" }}
      >
        <div
          className={cn(
            "w-full px-0 bp-lg:pr-8 xl:pr-12 2xl:pr-16",
            showSideMenu ? "bp-lg:pl-64 xl:pl-72" : "bp-lg:pl-0 xl:pl-0",
          )}
        >
          {children}
        </div>
      </main>
    </>
  );
}
