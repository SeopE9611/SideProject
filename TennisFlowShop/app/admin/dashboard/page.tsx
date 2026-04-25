import AdminDashboardClient from "./_components/AdminDashboardClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "관리자 대시보드",
};

export default async function AdminDashboardPage() {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        <AdminDashboardClient />
      </div>
    </div>
  );
}
