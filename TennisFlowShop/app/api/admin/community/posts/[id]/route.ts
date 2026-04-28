import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import {
  normalizeSanitizedContent,
  sanitizeHtml,
  validateSanitizedLength,
} from "@/lib/sanitize";

type EditableCommunityPost = {
  _id: ObjectId;
  title?: string;
  content?: string;
  category?: string;
  status?: "public" | "hidden";
  type?: string;
  nickname?: string;
  userId?: ObjectId | string;
  views?: number;
  commentsCount?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

function summarizeCommunityPost(doc: EditableCommunityPost | null) {
  const safe = doc ?? ({} as EditableCommunityPost);
  return {
    title: typeof safe.title === "string" ? safe.title : "",
    type: typeof safe.type === "string" ? safe.type : undefined,
    category: typeof safe.category === "string" ? safe.category : undefined,
    status: typeof safe.status === "string" ? safe.status : undefined,
    isPinned: typeof (safe as any).isPinned === "boolean" ? (safe as any).isPinned : undefined,
    authorId: safe.userId ? String(safe.userId) : undefined,
    attachmentCount: Array.isArray((safe as any).attachments)
      ? (safe as any).attachments.length
      : 0,
  };
}

/**
 * 관리자 게시글 조회 API
 * - 관리자 상세/수정 화면에서 동일 데이터소스(community_posts)를 직접 조회한다.
 * - 일반 사용자 API 스키마와 분리해, 관리자 플로우 계약을 고정한다.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const { db } = guard;

  const { id } = await context.params;
  if (!ObjectId.isValid(id))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const col = db.collection<EditableCommunityPost>("community_posts");
  const doc = await col.findOne(
    { _id: new ObjectId(id) },
    {
      projection: {
        _id: 1,
        title: 1,
        content: 1,
        category: 1,
        status: 1,
        type: 1,
        nickname: 1,
        userId: 1,
        views: 1,
        commentsCount: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  );

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    item: {
      id: String(doc._id),
      title: doc.title ?? "",
      content: doc.content ?? "",
      category: doc.category ?? "",
      status: doc.status ?? "hidden",
      type: doc.type ?? "free",
      authorNickname: doc.nickname ?? "",
      authorDisplayName: doc.nickname ?? "",
      authorId: doc.userId ? String(doc.userId) : "",
      views: doc.views ?? 0,
      commentsCount: doc.commentsCount ?? 0,
      createdAt: doc.createdAt ?? null,
      updatedAt: doc.updatedAt ?? null,
    },
  });
}

/**
 * 관리자 게시글 수정 API
 * - requireAdmin + verifyAdminCsrf를 강제해 관리자 전용 수정 경로를 보장한다.
 * - 저장 대상은 community_posts 컬렉션으로 고정한다.
 */
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
  const title = String(body?.title ?? "").trim();
  const category = String(body?.category ?? "").trim();
  const rawContent = String(body?.content ?? "");

  if (!title) {
    return NextResponse.json(
      { error: "제목을 입력해 주세요." },
      { status: 422 },
    );
  }

  const sanitizedContent = normalizeSanitizedContent(
    await sanitizeHtml(rawContent),
  );
  if (!sanitizedContent.trim()) {
    return NextResponse.json(
      { error: "내용을 입력해 주세요." },
      { status: 422 },
    );
  }

  const lengthValidation = validateSanitizedLength(sanitizedContent, {
    min: 1,
    max: 5000,
  });
  if (lengthValidation === "too_short") {
    return NextResponse.json(
      { error: "내용을 입력해 주세요." },
      { status: 422 },
    );
  }
  if (lengthValidation === "too_long") {
    return NextResponse.json(
      { error: "내용은 5,000자 이하로 입력해 주세요." },
      { status: 422 },
    );
  }

  const col = db.collection<EditableCommunityPost>("community_posts");
  const beforeDoc = await col.findOne({ _id: new ObjectId(id) });
  if (!beforeDoc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        title,
        content: sanitizedContent,
        category,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after", projection: { _id: 1 } },
  );

  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const before = summarizeCommunityPost(beforeDoc);
  const after = summarizeCommunityPost({
    ...beforeDoc,
    title,
    category,
    content: sanitizedContent,
    updatedAt: new Date(),
  });
  await appendAdminAudit(
    db,
    {
      type: "community.post.update",
      actorId: guard.admin._id,
      targetId: id,
      message: "관리자 게시글 수정",
      diff: {
        targetType: "communityPost",
        before: {
          title: before.title,
          type: before.type,
          category: before.category,
          status: before.status,
          isPinned: before.isPinned,
        },
        after: {
          title: after.title,
          type: after.type,
          category: after.category,
          status: after.status,
          isPinned: after.isPinned,
        },
        metadata: {
          changedKeys: ["title", "category", "content"],
          contentChanged: (beforeDoc.content ?? "") !== sanitizedContent,
          attachmentCountBefore: before.attachmentCount,
          attachmentCountAfter: after.attachmentCount,
        },
      },
    },
    req,
  );

  return NextResponse.json({ ok: true, id: String(result._id) });
}

export async function DELETE(
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

  const col = db.collection("community_posts");
  const beforeDoc = (await col.findOne({ _id: new ObjectId(id) })) as EditableCommunityPost | null;
  if (!beforeDoc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const result = await col.deleteOne({ _id: new ObjectId(id) });

  if (!result.deletedCount) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const before = summarizeCommunityPost(beforeDoc);
  await appendAdminAudit(
    db,
    {
      type: "community.post.delete",
      actorId: guard.admin._id,
      targetId: id,
      message: "관리자 게시글 삭제",
      diff: {
        targetType: "communityPost",
        before: {
          title: before.title,
          type: before.type,
          category: before.category,
          status: before.status,
          authorId: before.authorId,
        },
        after: { deleted: true },
      },
    },
    req,
  );

  return NextResponse.json({ ok: true });
}
