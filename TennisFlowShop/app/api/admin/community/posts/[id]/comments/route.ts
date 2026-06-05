import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { requireAdmin } from "@/lib/admin.guard";
import {
  getValidCommunityUserObjectIds,
  resolveCommunityDisplayName,
} from "@/lib/community-display-name";
import type { CommunityComment } from "@/lib/types/community";

function parseListQuery(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const pageRaw = Number(searchParams.get("page") ?? "1");
  const limitRaw = Number(searchParams.get("limit") ?? "20");
  const pageInt =
    Number.isFinite(pageRaw) && pageRaw > 0 ? Math.trunc(pageRaw) : 1;
  const limitInt =
    Number.isFinite(limitRaw) && limitRaw > 0 ? Math.trunc(limitRaw) : 20;

  return {
    page: Math.min(10_000, Math.max(1, pageInt)),
    limit: Math.min(100, Math.max(1, limitInt)),
  };
}

function getTimeValue(value: unknown) {
  const time = new Date(String(value ?? "")).getTime();
  return Number.isFinite(time) ? time : 0;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const { db } = guard;

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { ok: false, error: "invalid_id" },
      { status: 400 },
    );
  }

  const { page, limit } = parseListQuery(req);
  const commentsCol = db.collection("community_comments");
  const postObjectId = new ObjectId(id);

  const visibleFilter = {
    postId: postObjectId,
    status: { $in: ["public", "deleted"] as const },
  };

  const total = await commentsCol.countDocuments(visibleFilter);
  const rootFilter = {
    ...visibleFilter,
    parentId: null,
  };
  const rootTotal = await commentsCol.countDocuments(rootFilter);

  const skip = (page - 1) * limit;
  const rootDocs = await commentsCol
    .find(rootFilter)
    .sort({ createdAt: 1, _id: 1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  const rootIds = rootDocs.map((d: any) => d._id);
  const replyDocs =
    rootIds.length > 0
      ? await commentsCol
          .find({
            postId: postObjectId,
            parentId: { $in: rootIds },
            status: { $in: ["public", "deleted"] as const },
          })
          .sort({ createdAt: 1, _id: 1 })
          .toArray()
      : [];

  const replyDocsByParentId = replyDocs.reduce<Map<string, any[]>>(
    (acc, doc: any) => {
      const parentId = doc.parentId ? String(doc.parentId) : "";
      if (!parentId) return acc;
      if (!acc.has(parentId)) acc.set(parentId, []);
      acc.get(parentId)!.push(doc);
      return acc;
    },
    new Map(),
  );

  for (const [, replies] of replyDocsByParentId) {
    replies.sort((a, b) => {
      const timeDiff = getTimeValue(a.createdAt) - getTimeValue(b.createdAt);
      if (timeDiff !== 0) return timeDiff;
      return String(a._id ?? "").localeCompare(String(b._id ?? ""));
    });
  }

  const sortedReplyDocs = rootIds.flatMap(
    (rootId) => replyDocsByParentId.get(String(rootId)) ?? [],
  );
  const docs = [...rootDocs, ...sortedReplyDocs];

  const userObjectIds = getValidCommunityUserObjectIds(
    docs.map((doc: any) => doc.userId ?? null),
  );
  const users = userObjectIds.length
    ? await db
        .collection("users")
        .find(
          { _id: { $in: userObjectIds } },
          { projection: { name: 1, nickname: 1 } },
        )
        .toArray()
    : [];
  const userMap = new Map(
    users.map((user) => [
      String(user._id),
      user as { _id: ObjectId; name?: string; nickname?: string },
    ]),
  );

  const items: CommunityComment[] = docs.map((d: any) => {
    const userId = d.userId ? String(d.userId) : null;
    const user = userId ? userMap.get(userId) : undefined;
    const displayName = resolveCommunityDisplayName({
      userName: user?.name,
      userNickname: user?.nickname,
      authorName: d.authorName,
      nickname: d.nickname,
      authorEmail: d.authorEmail,
    });

    return {
      id: String(d._id),
      postId:
        d.postId instanceof ObjectId ? d.postId.toString() : String(d.postId),
      parentId:
        d.parentId instanceof ObjectId
          ? d.parentId.toString()
          : d.parentId
            ? String(d.parentId)
            : null,
      userId,
      nickname: displayName,
      authorName: d.authorName,
      authorEmail: d.authorEmail,
      content: d.content ?? "",
      status: d.status ?? "public",
      createdAt:
        d.createdAt instanceof Date
          ? d.createdAt.toISOString()
          : String(d.createdAt),
      updatedAt:
        d.updatedAt instanceof Date
          ? d.updatedAt.toISOString()
          : d.updatedAt
            ? String(d.updatedAt)
            : undefined,
    };
  });

  return NextResponse.json(
    { ok: true, items, total, rootTotal, page, limit },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
  );
}
