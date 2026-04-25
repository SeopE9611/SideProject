import AdminRentalDetailClient from "@/app/admin/rentals/[id]/_components/AdminRentalDetailClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "대여 상세",
};

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;

  return <AdminRentalDetailClient />;
}
