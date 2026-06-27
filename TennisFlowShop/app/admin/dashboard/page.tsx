import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "관리자 대시보드",
};

export default function AdminDashboardPage() {
  redirect("/admin/operations");
}
