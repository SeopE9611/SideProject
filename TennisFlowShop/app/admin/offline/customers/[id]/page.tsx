import type { Metadata } from "next";
import AdminPageShell from "@/components/admin/AdminPageShell";
import OfflineCustomerDetailClient from "./_components/OfflineCustomerDetailClient";

export const metadata: Metadata = { title: "오프라인 고객 상세" };

export default async function OfflineCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminPageShell>
      <OfflineCustomerDetailClient id={id} />
    </AdminPageShell>
  );
}
