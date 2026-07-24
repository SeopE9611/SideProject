"use client";

import type React from "react";
import { usePathname } from "next/navigation";

import Footer from "@/components/footer";
import Header from "@/components/header";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const showPublicChrome = !isAdmin;

  return (
    <>
      {showPublicChrome && <Header />}
      <main
        id="main"
        className="flex-1"
        style={{ paddingTop: showPublicChrome ? "var(--header-h, 0px)" : 0 }}
      >
        <div className="w-full px-0">{children}</div>
      </main>

      {showPublicChrome && <Footer />}
    </>
  );
}
