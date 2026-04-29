import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";

const MAX_BODY_LENGTH = 2000;

function parseBody(raw: unknown) {
  const body = typeof raw === "string" ? raw.trim() : "";
  if (!body) return { ok: false as const, message: "body required" };
  if (body.length > MAX_BODY_LENGTH) return { ok: false as const, message: "body too long" };
  return { ok: true as const, body };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req); if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req); if (!csrf.ok) return csrf.res;
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: "invalid id" }, { status: 400 });
  const noteId = new ObjectId(id);
  const payload = await req.json().catch(() => ({}));
  const parsed = parseBody((payload as any).body);
  if (!parsed.ok) return NextResponse.json({ message: parsed.message }, { status: 400 });
  const coll = guard.db.collection("admin_notes");
  const note = await coll.findOne({ _id: noteId });
  if (!note) return NextResponse.json({ message: "not found" }, { status: 404 });
  if (note.isDeleted === true) return NextResponse.json({ message: "deleted note" }, { status: 400 });
  const now = new Date();
  await coll.updateOne({ _id: noteId }, { $set: { body: parsed.body, updatedAt: now, editedAt: now } });
  await appendAdminAudit(guard.db, { type: "note.update", actorId: guard.admin._id, targetId: noteId, message: "관리자 내부 메모 수정", diff: { metadata: { actor: { id: String(guard.admin._id), email: guard.admin.email ?? null, name: guard.admin.name ?? null, role: guard.admin.role ?? "admin" }, target: { type: note.targetType, id: String(note.targetId), scope: "admin_note" } }, change: { before: { bodyLength: String(note.body ?? "").length }, after: { bodyLength: parsed.body.length } }, noteId: String(noteId), targetType: note.targetType, targetId: String(note.targetId), beforeBodyLength: String(note.body ?? "").length, afterBodyLength: parsed.body.length } }, req);
  const updated = await coll.findOne({ _id: noteId });
  return NextResponse.json({ success: true, item: { id: String(updated?._id), targetType: updated?.targetType, targetId: String(updated?.targetId), body: updated?.body, createdBy: updated?.createdBy ? String(updated.createdBy) : null, createdByEmail: updated?.createdByEmail ?? null, createdByName: updated?.createdByName ?? null, createdByRole: updated?.createdByRole ?? null, createdAt: updated?.createdAt instanceof Date ? updated.createdAt.toISOString() : null, updatedAt: updated?.updatedAt instanceof Date ? updated.updatedAt.toISOString() : null, editedAt: updated?.editedAt instanceof Date ? updated.editedAt.toISOString() : null } });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req); if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req); if (!csrf.ok) return csrf.res;
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: "invalid id" }, { status: 400 });
  const noteId = new ObjectId(id);
  const coll = guard.db.collection("admin_notes");
  const note = await coll.findOne({ _id: noteId });
  if (!note) return NextResponse.json({ message: "not found" }, { status: 404 });
  if (note.isDeleted === true) return NextResponse.json({ success: true });
  const now = new Date();
  await coll.updateOne({ _id: noteId }, { $set: { isDeleted: true, deletedAt: now, deletedBy: guard.admin._id, deletedByEmail: guard.admin.email ?? null, deletedByName: guard.admin.name ?? null, deletedByRole: guard.admin.role ?? "admin", updatedAt: now } });
  await appendAdminAudit(guard.db, { type: "note.delete", actorId: guard.admin._id, targetId: noteId, message: "관리자 내부 메모 삭제", diff: { metadata: { actor: { id: String(guard.admin._id), email: guard.admin.email ?? null, name: guard.admin.name ?? null, role: guard.admin.role ?? "admin" }, target: { type: note.targetType, id: String(note.targetId), scope: "admin_note" } }, noteId: String(noteId), targetType: note.targetType, targetId: String(note.targetId), bodyLength: String(note.body ?? "").length } }, req);
  return NextResponse.json({ success: true });
}
