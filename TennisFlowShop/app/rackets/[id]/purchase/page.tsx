import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "라켓 구매",
};

export default async function RacketPurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/rackets/${id}/select-string`);
}
