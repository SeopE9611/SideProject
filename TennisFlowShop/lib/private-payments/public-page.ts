import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import {
  privatePayments,
  serializePrivatePayment,
  type SerializedPrivatePayment,
} from "@/lib/private-payments";

export type PublicPrivatePaymentView = {
  item: SerializedPrivatePayment;
  isExpired: boolean;
};

export async function getPublicPrivatePaymentView(
  id: string,
): Promise<PublicPrivatePaymentView | null> {
  if (!ObjectId.isValid(id)) return null;

  const db = (await clientPromise).db();
  const doc = await privatePayments(db).findOne({ _id: new ObjectId(id) });
  if (!doc) return null;

  const item = serializePrivatePayment(doc);
  const expiresAtMs = item.expiresAt
    ? new Date(item.expiresAt).getTime()
    : Number.POSITIVE_INFINITY;
  const nowMs = Date.now();

  const isExpired =
    item.paymentStatus === "결제대기" && Number.isFinite(expiresAtMs) && expiresAtMs < nowMs;

  return { item, isExpired };
}
