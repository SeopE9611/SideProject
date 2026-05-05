import { Db, ObjectId } from "mongodb";
import { maskPhone, normalizeEmail, normalizePhone } from "@/lib/offline/normalizers";

export async function ensureOfflineIndexes(db: Db) {
  await Promise.all([
    db.collection("offline_customers").createIndexes([
      { key: { phoneNormalized: 1 } },
      { key: { emailLower: 1 } },
      { key: { linkedUserId: 1 } },
      { key: { createdAt: -1 } },
    ]),
    db.collection("offline_service_records").createIndexes([
      { key: { offlineCustomerId: 1 } },
      { key: { userId: 1 } },
      { key: { occurredAt: -1 } },
      { key: { status: 1 } },
      { key: { "payment.status": 1 } },
      { key: { kind: 1 } },
    ]),
  ]);
}

export function toId(value: unknown): string {
  return value instanceof ObjectId ? value.toString() : String(value || "");
}

export function sanitizeCustomer(doc: Record<string, any>, masked = false) {
  return {
    id: toId(doc._id),
    linkedUserId: doc.linkedUserId ? toId(doc.linkedUserId) : null,
    name: doc.name || "",
    phone: masked ? undefined : doc.phone,
    phoneMasked: maskPhone(doc.phone || ""),
    email: doc.email ?? null,
    memo: doc.memo,
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    source: "offline_admin" as const,
    stats: doc.stats,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : null,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : null,
  };
}

export function buildCustomerSearchFilter(q: string) {
  const trimmed = q.trim();
  const phoneNormalized = normalizePhone(trimmed);
  const emailLower = normalizeEmail(trimmed);
  const regex = trimmed ? new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;
  const or: Record<string, any>[] = [];
  if (regex) or.push({ name: regex }, { phone: regex }, { email: regex });
  if (phoneNormalized) or.push({ phoneNormalized });
  if (emailLower) or.push({ emailLower });
  return or.length ? { $or: or } : {};
}
