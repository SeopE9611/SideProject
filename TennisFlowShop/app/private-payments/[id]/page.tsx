import { notFound } from "next/navigation";
import { getPublicPrivatePaymentView } from "@/lib/private-payments/public-page";
import PrivatePaymentClient from "./PrivatePaymentClient";

export default async function PrivatePaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = await getPublicPrivatePaymentView(id);
  if (!view) notFound();

  return <PrivatePaymentClient item={view.item} isExpired={view.isExpired} />;
}
