import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "관리자 페이지",
};

export default function AdminHomePage() {
  redirect("/admin/dashboard");
}
