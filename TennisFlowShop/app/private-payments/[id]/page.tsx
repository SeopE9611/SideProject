import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { privatePayments, serializePrivatePayment } from "@/lib/private-payments";
import { getServerNowMs } from "@/lib/server-time";
import PrivatePaymentClient from "./PrivatePaymentClient";

export default async function PrivatePaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();
  const db = (await clientPromise).db();
  const item = await privatePayments(db).findOne({ _id: new ObjectId(id) });
  if (!item) notFound();

  const serialized = serializePrivatePayment(item);
  const nowMs = getServerNowMs();
  const isExpired =
    serialized.paymentStatus === "결제대기" &&
    !!serialized.expiresAt &&
    new Date(serialized.expiresAt).getTime() < nowMs;

  return <PrivatePaymentClient item={serialized} isExpired={isExpired} />;
}
