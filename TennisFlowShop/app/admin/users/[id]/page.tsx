import UserDetailClient from "@/app/admin/users/_components/UserDetailClient";
import AdminPageShell from "@/components/admin/AdminPageShell";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "회원 상세",
};

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AdminPageShell variant="wide">
      <UserDetailClient id={id} />
    </AdminPageShell>
  );
}
