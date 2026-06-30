import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { privatePayments, serializePrivatePayment } from "@/lib/private-payments";
import PrivatePaymentClient from "./PrivatePaymentClient";

export default async function PrivatePaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();
  const db = (await clientPromise).db();
  const item = await privatePayments(db).findOne({ _id: new ObjectId(id) });
  if (!item) notFound();
  return <PrivatePaymentClient item={serializePrivatePayment(item)} />;
}
