import { NextResponse } from "next/server";
import { MongoServerError, ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { offlineCustomerCreateSchema } from "@/lib/offline/validators";
import { buildCustomerSearchFilter, sanitizeCustomer } from "@/lib/offline/offline.repository";
import { normalizeEmail, normalizePhone } from "@/lib/offline/normalizers";

function isLinkedUserDuplicate(error: unknown) {
  if (!(error instanceof MongoServerError) || error.code !== 11000) return false;
  return (
    error.keyPattern?.linkedUserId === 1 ||
    Object.prototype.hasOwnProperty.call(error.keyValue ?? {}, "linkedUserId")
  );
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const { db } = guard;
  const q = new URL(req.url).searchParams.get("q") || "";
  const items = await db
    .collection("offline_customers")
    .find(buildCustomerSearchFilter(q))
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  return NextResponse.json({
    items: items.map((d) => sanitizeCustomer(d as any, true)),
  });
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;
  const body = await req.json().catch(() => null);
  const parsed = offlineCustomerCreateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { message: "invalid body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  const { db, admin } = guard;
  const data = parsed.data;
  const phoneNormalized = normalizePhone(data.phone);
  const emailLower = normalizeEmail(data.email);
  const linkedUserId =
    data.linkedUserId && ObjectId.isValid(data.linkedUserId)
      ? new ObjectId(data.linkedUserId)
      : null;
  const duplicate = await db
    .collection("offline_customers")
    .findOne({ name: data.name, phoneNormalized }, { projection: { _id: 1 } });
  if (duplicate)
    return NextResponse.json(
      { message: "duplicate", existingId: String((duplicate as any)._id) },
      { status: 409 },
    );
  if (linkedUserId) {
    const linkedCustomer = await db
      .collection("offline_customers")
      .findOne({ linkedUserId }, { projection: { _id: 1 } });
    if (linkedCustomer)
      return NextResponse.json(
        {
          message: "user already linked to another offline customer",
          offlineCustomerId: String(linkedCustomer._id),
        },
        { status: 409 },
      );
  }
  const now = new Date();
  const doc: Record<string, any> = {
    linkedUserId,
    name: data.name,
    phone: data.phone,
    phoneNormalized,
    email: data.email ?? null,
    emailLower,
    memo: data.memo ?? "",
    tags: data.tags ?? [],
    source: "offline_admin",
    stats: { visitCount: 0, totalPaid: 0, totalServiceCount: 0 },
    createdAt: now,
    updatedAt: now,
    createdBy: admin._id,
  };
  let result;
  try {
    result = await db.collection("offline_customers").insertOne(doc);
  } catch (error) {
    if (!linkedUserId || !isLinkedUserDuplicate(error)) throw error;
    const linkedCustomer = await db
      .collection("offline_customers")
      .findOne({ linkedUserId }, { projection: { _id: 1 } });
    if (!linkedCustomer) throw error;
    return NextResponse.json(
      {
        message: "user already linked to another offline customer",
        offlineCustomerId: String(linkedCustomer._id),
      },
      { status: 409 },
    );
  }
  await appendAdminAudit(
    db,
    {
      type: "offline_customer_create",
      actorId: admin._id,
      targetId: result.insertedId,
      message: "오프라인 고객 등록",
    },
    req,
  );
  return NextResponse.json(
    { item: sanitizeCustomer({ ...doc, _id: result.insertedId } as any) },
    { status: 201 },
  );
}
