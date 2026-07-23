"use client";

import type React from "react";
import { usePathname } from "next/navigation";

import Footer from "@/components/footer";
import Header from "@/components/header";
import SideMenu from "@/components/nav/SideMenu";
import { cn } from "@/lib/utils";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  // 글로벌 보조 메뉴는 카탈로그 목록 화면에서만 제공한다.
  const showSideMenu = pathname === "/products" || pathname === "/rackets";
  const showPublicChrome = !isAdmin;

  return (
    <>
      {showPublicChrome && <Header />}
      {showSideMenu && <SideMenu />}

      <main
        id="main"
        className="flex-1"
        style={{ paddingTop: showPublicChrome ? "var(--header-h, 0px)" : 0 }}
      >
        <div
          className={cn(
            "w-full px-0 bp-lg:pr-8 xl:pr-12 2xl:pr-16",
            showSideMenu ? "bp-lg:pl-72 xl:pl-80" : "bp-lg:pl-0 xl:pl-0",
          )}
        >
          {children}
        </div>
      </main>

      {showPublicChrome && <Footer showSideMenu={showSideMenu} />}
    </>
  );
}
