import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { db } = guard;
  const body = await req.json().catch(() => null);
  const ids: unknown[] = Array.isArray(body?.ids) ? body.ids : [];

  const objectIds = ids
    .map((id: unknown) =>
      typeof id === "string" && ObjectId.isValid(id) ? new ObjectId(id) : null,
    )
    .filter((id): id is ObjectId => id !== null);

  if (objectIds.length === 0) {
    return NextResponse.json({ error: "ids_required" }, { status: 400 });
  }

  const postsCol = db.collection("community_posts");
  const commentsCol = db.collection("community_comments");
  const likesCol = db.collection("community_likes");
  const reportsCol = db.collection("community_reports");

  const [postDeleteResult] = await Promise.all([
    postsCol.deleteMany({ _id: { $in: objectIds } }),
    commentsCol.deleteMany({ postId: { $in: objectIds } }),
    likesCol.deleteMany({ postId: { $in: objectIds } }),
    reportsCol.deleteMany({ postId: { $in: objectIds } }),
  ]);

  return NextResponse.json({
    success: true,
    deletedCount: postDeleteResult.deletedCount ?? 0,
  });
}
