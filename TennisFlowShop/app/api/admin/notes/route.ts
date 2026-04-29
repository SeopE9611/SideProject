import { NextResponse } from "next/server";
import { ObjectId, type Db } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";

type AllowedTargetType = "order" | "rental" | "stringingApplication" | "user";
const TARGET_COLLECTION_MAP: Record<AllowedTargetType, string> = { order: "orders", rental: "rental_orders", stringingApplication: "stringing_applications", user: "users" };
const MAX_BODY_LENGTH = 2000;
const parseTargetType = (v: unknown): AllowedTargetType | null => (typeof v === "string" && v in TARGET_COLLECTION_MAP ? (v as AllowedTargetType) : null);
const parseObjectId = (v: unknown): ObjectId | null => (typeof v === "string" && ObjectId.isValid(v) ? new ObjectId(v) : null);

const mapNoteItem = (doc: any) => ({ id: String(doc._id), targetType: doc.targetType, targetId: String(doc.targetId), body: doc.body, createdBy: doc.createdBy ? String(doc.createdBy) : null, createdByEmail: doc.createdByEmail ?? null, createdByName: doc.createdByName ?? null, createdByRole: doc.createdByRole ?? null, createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : null, updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : null, editedAt: doc.editedAt instanceof Date ? doc.editedAt.toISOString() : null });

function validateBody(raw: unknown) { const body = typeof raw === "string" ? raw.trim() : ""; if (!body) return { ok: false as const, message: "body required" }; if (body.length > MAX_BODY_LENGTH) return { ok: false as const, message: "body too long" }; return { ok: true as const, body }; }
async function validateTarget(db: Db, targetType: AllowedTargetType, targetId: ObjectId) { return Boolean(await db.collection(TARGET_COLLECTION_MAP[targetType]).findOne({ _id: targetId }, { projection: { _id: 1 } })); }

export async function GET(req: Request) {
  const guard = await requireAdmin(req); if (!guard.ok) return guard.res;
  const url = new URL(req.url);
  const targetType = parseTargetType(url.searchParams.get("targetType"));
  const targetId = parseObjectId(url.searchParams.get("targetId"));
  if (!targetType || !targetId) return NextResponse.json({ message: "invalid target" }, { status: 400 });
  if (!(await validateTarget(guard.db, targetType, targetId))) return NextResponse.json({ message: "target not found" }, { status: 404 });
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "20", 10) || 20));
  const skip = (page - 1) * limit;
  const query = { targetType, targetId, isDeleted: { $ne: true } };
  const coll = guard.db.collection("admin_notes");
  const [docs, total] = await Promise.all([coll.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(), coll.countDocuments(query)]);
  return NextResponse.json({ success: true, items: docs.map(mapNoteItem), page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req); if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req); if (!csrf.ok) return csrf.res;
  const payload = await req.json().catch(() => ({}));
  const targetType = parseTargetType((payload as any).targetType);
  const targetId = parseObjectId((payload as any).targetId);
  const bodyParsed = validateBody((payload as any).body);
  if (!targetType || !targetId) return NextResponse.json({ message: "invalid target" }, { status: 400 });
  if (!bodyParsed.ok) return NextResponse.json({ message: bodyParsed.message }, { status: 400 });
  if (!(await validateTarget(guard.db, targetType, targetId))) return NextResponse.json({ message: "target not found" }, { status: 404 });
  const now = new Date();
  const doc = { targetType, targetId, body: bodyParsed.body, createdBy: guard.admin._id, createdByEmail: guard.admin.email ?? null, createdByName: guard.admin.name ?? null, createdByRole: guard.admin.role ?? "admin", createdAt: now, updatedAt: now, isDeleted: false, visibility: "admin_only" as const };
  const result = await guard.db.collection("admin_notes").insertOne(doc);
  await appendAdminAudit(guard.db, { type: "note.create", actorId: guard.admin._id, targetId: result.insertedId, message: "관리자 내부 메모 생성", diff: { metadata: { actor: { id: String(guard.admin._id), email: guard.admin.email ?? null, name: guard.admin.name ?? null, role: guard.admin.role ?? "admin" }, target: { type: targetType, id: String(targetId), scope: "admin_note" } }, noteId: String(result.insertedId), targetType, targetId: String(targetId), bodyLength: bodyParsed.body.length } }, req);
  return NextResponse.json({ success: true, item: mapNoteItem({ ...doc, _id: result.insertedId }) });
}
