import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";

const ALLOWED = new Set(["public", "hidden"]);

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;
  const { db } = guard;

  const { id } = await context.params;
  if (!ObjectId.isValid(id))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const status = String(body?.status ?? "").trim();

  if (!ALLOWED.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const col = db.collection("community_posts");
  const beforeDoc = await col.findOne(
    { _id: new ObjectId(id) },
    { projection: { status: 1, title: 1, type: 1, category: 1 } },
  );
  if (!beforeDoc)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const r = await col.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status, updatedAt: new Date() } },
  );

  if (!r.matchedCount)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await appendAdminAudit(
    db,
    {
      type: "community.post.status",
      actorId: guard.admin._id,
      targetId: id,
      message: "관리자 게시글 상태 변경",
      diff: {
        targetType: "communityPost",
        before: {
          status:
            typeof beforeDoc.status === "string" ? beforeDoc.status : undefined,
        },
        after: { status },
        metadata: {
          reason: typeof body?.reason === "string" ? body.reason : undefined,
          actor: {
            id: String(guard.admin._id),
            email: guard.admin.email ?? null,
            name: guard.admin.name ?? null,
            role: guard.admin.role ?? "admin",
          },
          title: typeof beforeDoc.title === "string" ? beforeDoc.title : "",
          boardType:
            typeof beforeDoc.type === "string"
              ? beforeDoc.type
              : typeof beforeDoc.category === "string"
                ? beforeDoc.category
                : undefined,
        },
      },
    },
    req,
  );
  return NextResponse.json({ ok: true });
}
