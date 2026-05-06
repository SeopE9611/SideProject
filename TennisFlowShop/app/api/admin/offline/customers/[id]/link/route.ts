import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAudit } from "@/lib/audit";
import { sanitizeCustomer } from "@/lib/offline/offline.repository";

const oid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

function sanitizeLinkedUser(user: any) {
  return user
    ? { id: String(user._id), name: user.name || "", email: user.email ?? null, phone: user.phone ?? null }
    : null;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const _id = oid((await ctx.params).id);
  if (!_id) return NextResponse.json({ message: "invalid customer id" }, { status: 400 });

  const body = await req.json().catch(() => null) as { userId?: unknown } | null;
  const userId = typeof body?.userId === "string" ? oid(body.userId) : null;
  if (!userId) return NextResponse.json({ message: "invalid userId" }, { status: 400 });

  const [customer, user] = await Promise.all([
    guard.db.collection("offline_customers").findOne({ _id }),
    guard.db.collection("users").findOne({ _id: userId }, { projection: { name: 1, email: 1, phone: 1 } }),
  ]);
  if (!customer) return NextResponse.json({ message: "customer not found" }, { status: 404 });
  if (!user) return NextResponse.json({ message: "user not found" }, { status: 404 });

  const previousLinkedUserId = customer.linkedUserId instanceof ObjectId ? customer.linkedUserId : null;
  if (previousLinkedUserId && !previousLinkedUserId.equals(userId)) {
    return NextResponse.json({ message: "customer already linked to another user" }, { status: 409 });
  }

  const duplicatedCustomer = await guard.db.collection("offline_customers").findOne(
    { _id: { $ne: _id }, linkedUserId: userId },
    { projection: { _id: 1 } },
  );
  if (duplicatedCustomer) {
    return NextResponse.json(
      { message: "user already linked to another offline customer", offlineCustomerId: String(duplicatedCustomer._id) },
      { status: 409 },
    );
  }

  await guard.db.collection("offline_customers").updateOne(
    { _id },
    { $set: { linkedUserId: userId, updatedAt: new Date(), updatedBy: guard.admin._id } },
  );
  const updated = await guard.db.collection("offline_customers").findOne({ _id });
  if (!updated) return NextResponse.json({ message: "customer not found" }, { status: 404 });

  await appendAudit(guard.db, {
    type: "offline_customer_link_user",
    actorId: guard.admin._id,
    targetId: _id,
    message: "오프라인 고객 온라인 회원 연결",
    diff: {
      offlineCustomerId: String(_id),
      userId: String(userId),
      previousLinkedUserId: previousLinkedUserId ? String(previousLinkedUserId) : null,
      nextLinkedUserId: String(userId),
    },
  }, req);

  return NextResponse.json({ item: sanitizeCustomer(updated as any), linkedUser: sanitizeLinkedUser(user) });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const _id = oid((await ctx.params).id);
  if (!_id) return NextResponse.json({ message: "invalid customer id" }, { status: 400 });

  const customer = await guard.db.collection("offline_customers").findOne({ _id });
  if (!customer) return NextResponse.json({ message: "customer not found" }, { status: 404 });

  const previousLinkedUserId = customer.linkedUserId instanceof ObjectId ? customer.linkedUserId : null;
  await guard.db.collection("offline_customers").updateOne(
    { _id },
    { $set: { linkedUserId: null, updatedAt: new Date(), updatedBy: guard.admin._id } },
  );
  const updated = await guard.db.collection("offline_customers").findOne({ _id });
  if (!updated) return NextResponse.json({ message: "customer not found" }, { status: 404 });

  await appendAudit(guard.db, {
    type: "offline_customer_unlink_user",
    actorId: guard.admin._id,
    targetId: _id,
    message: "오프라인 고객 온라인 회원 연결 해제",
    diff: {
      offlineCustomerId: String(_id),
      userId: previousLinkedUserId ? String(previousLinkedUserId) : null,
      previousLinkedUserId: previousLinkedUserId ? String(previousLinkedUserId) : null,
      nextLinkedUserId: null,
    },
  }, req);

  return NextResponse.json({ item: sanitizeCustomer(updated as any) });
}
