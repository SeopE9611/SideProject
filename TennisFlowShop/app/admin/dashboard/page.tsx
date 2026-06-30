import type { Metadata } from "next";

import AdminDashboardClient from "./_components/AdminDashboardClient";

export const metadata: Metadata = {
  title: "관리자 대시보드",
};

export default function AdminDashboardPage() {
  return <AdminDashboardClient />;
}
