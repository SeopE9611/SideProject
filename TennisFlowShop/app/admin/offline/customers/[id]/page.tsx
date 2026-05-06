import type { Metadata } from "next";
import OfflineCustomerDetailClient from "./_components/OfflineCustomerDetailClient";

export const metadata: Metadata = { title: "오프라인 고객 상세" };

export default async function OfflineCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        <OfflineCustomerDetailClient id={id} />
      </div>
    </div>
  );
}
