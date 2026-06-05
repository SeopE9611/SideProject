import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { ok: false, error: "invalid_id" },
      { status: 400 },
    );
  }

  const { db } = guard;
  const commentsCol = db.collection("community_comments");
  const postsCol = db.collection("community_posts");
  const reportsCol = db.collection("community_reports");
  const commentObjectId = new ObjectId(id);

  const existing = await commentsCol.findOne({ _id: commentObjectId });
  if (!existing) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  const targetIds = [commentObjectId];
  const replies = await commentsCol
    .find({ parentId: commentObjectId })
    .project({ _id: 1 })
    .toArray();
  targetIds.push(...replies.map((reply: any) => reply._id as ObjectId));

  await commentsCol.deleteMany({ _id: { $in: targetIds } });
  await reportsCol.deleteMany({ commentId: { $in: targetIds } });

  const deletedCount = targetIds.length;
  if (existing.postId instanceof ObjectId) {
    await postsCol.updateOne({ _id: existing.postId }, [
      {
        $set: {
          commentsCount: {
            $max: [
              0,
              {
                $subtract: [{ $ifNull: ["$commentsCount", 0] }, deletedCount],
              },
            ],
          },
          updatedAt: new Date(),
        },
      },
    ]);
  }

  return NextResponse.json({ success: true, deletedCount });
}
