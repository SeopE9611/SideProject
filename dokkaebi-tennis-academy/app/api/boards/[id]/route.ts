import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sanitizeHtml } from '@/lib/sanitize';

// supabase 상수/핼퍼
const STORAGE_BUCKET = 'tennis-images';

function toStoragePathFromPublicUrl(url: string) {
  // 예: https://.../storage/v1/object/public/<bucket>/<path>
  const m = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  return m ? m[1] : '';
}
// 관리자 확인 헬퍼
async function mustAdmin() {
  const at = (await cookies()).get('accessToken')?.value;
  const payload = at ? verifyAccessToken(at) : null;
  return payload && payload.role === 'admin' ? payload : null;
}

// QnA 카테고리 라벨/코드
const QNA_CATEGORY_LABELS = ['상품문의', '주문/결제', '배송', '환불/교환', '서비스', '아카데미', '회원', '일반문의'] as const;
const QNA_CATEGORY_CODES = ['product', 'order', 'delivery', 'refund', 'service', 'academy', 'member', 'general'] as const;

// Notice 카테고리 라벨/코드
const NOTICE_CATEGORY_LABELS = ['일반', '이벤트', '아카데미', '점검', '긴급'] as const;
const NOTICE_CATEGORY_CODES = ['general', 'event', 'academy', 'maintenance', 'urgent'] as const;

// 공통 category 스키마
const categorySchema = z
  .union([
    z.enum(QNA_CATEGORY_LABELS as unknown as [string, ...string[]]),
    z.enum(QNA_CATEGORY_CODES as unknown as [string, ...string[]]),
    z.enum(NOTICE_CATEGORY_LABELS as unknown as [string, ...string[]]),
    z.enum(NOTICE_CATEGORY_CODES as unknown as [string, ...string[]]),
  ])
  .optional();

const updateSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  content: z.string().trim().min(2).max(20000).optional(),
  category: categorySchema,
  productRef: z
    .object({
      productId: z.string(),
      name: z.string().optional(),
      image: z.string().url().nullable().optional(),
    })
    .optional(),
  isSecret: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  status: z.enum(['published', 'hidden', 'deleted']).optional(),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        name: z.string().optional(),
        mime: z.string().optional(),
        size: z.number().optional(),
        storagePath: z.string().optional(), // 서버에서 실제 삭제에 사용
      })
    )
    .optional(),
});

function canEdit(payload: any, post: any) {
  const isAdmin = payload?.role === 'admin';
  const isOwner = String(payload?.sub || '') === String(post.authorId || '');
  return isAdmin || isOwner;
}

// ObjectId 변환 헬퍼
function toObjectId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

// board_posts 공용 헬퍼: 찾기/업데이트/삭제 2단계 시도
const BoardRepo = {
  async findOneById(db: any, id: string) {
    const col = db.collection('board_posts');
    const oid = toObjectId(id);
    if (oid) {
      const doc = await col.findOne({ _id: oid });
      if (doc) return doc;
    }
    // TS가 _id에 string을 싫어하므로 제한적으로 any 캐스팅
    return await col.findOne({ _id: id as any });
  },

  async incViewCount(db: any, id: string) {
    const col = db.collection('board_posts');
    const oid = toObjectId(id);
    if (oid) {
      const r = await col.updateOne({ _id: oid }, { $inc: { viewCount: 1 } });
      if (r.matchedCount > 0) return;
    }
    await col.updateOne({ _id: id as any }, { $inc: { viewCount: 1 } });
  },

  async findOneAndUpdateById(db: any, id: string, patch: any) {
    const col = db.collection('board_posts');
    const oid = toObjectId(id);
    if (oid) {
      const res = await col.findOneAndUpdate({ _id: oid }, { $set: patch }, { returnDocument: 'after' });
      if (res?.value) return res;
    }
    return await col.findOneAndUpdate({ _id: id as any }, { $set: patch }, { returnDocument: 'after' });
  },

  async deleteOneById(db: any, id: string) {
    const col = db.collection('board_posts');
    const oid = toObjectId(id);
    if (oid) {
      const r = await col.deleteOne({ _id: oid });
      if (r.deletedCount > 0) return r;
    }
    return await col.deleteOne({ _id: id as any });
  },
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = await getDb();
  const { id } = await params;

  const post = await BoardRepo.findOneById(db, id);

  if (!post) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  // 권한 확인
  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  const isAdmin = payload?.role === 'admin';
  const isOwner = payload?.sub && String(payload.sub) === String(post.authorId);

  // 비밀글: 권한 없으면 본문/첨부 마스킹
  if (post.isSecret && !isAdmin && !isOwner) {
    delete (post as any).content;
    delete (post as any).attachments;
  } else {
    // 조회수 증가 (published만)
    if (post.status === 'published') {
      await BoardRepo.incViewCount(db, id);

      post.viewCount = (post.viewCount ?? 0) + 1; // 응답 일관성
    }
  }

  return NextResponse.json({ ok: true, item: post });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const db = await getDb();
  const { id } = await params;
  const post = await BoardRepo.findOneById(db, id);

  if (!post) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  if (!canEdit(payload, post)) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

  const bodyRaw = await req.json();
  const parsed = updateSchema.safeParse(bodyRaw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });

  // 클라이언트가 보낸 removedPaths(옵션) 분리
  const removedPaths: string[] = Array.isArray((bodyRaw as any).removedPaths) ? (bodyRaw as any).removedPaths.filter((p: any) => typeof p === 'string' && p) : [];

  // attachments: storagePath가 없으면 public URL을 파싱해 보완
  let normalizedAttachments = parsed.data.attachments;
  if (Array.isArray(normalizedAttachments)) {
    normalizedAttachments = normalizedAttachments.map((a) => ({
      ...a,
      storagePath: a.storagePath || toStoragePathFromPublicUrl(a.url),
    }));
  }

  // removedPaths 반영을 "먼저" 해서, 이후 분리에도 동일하게 적용
  if (removedPaths.length > 0 && Array.isArray(normalizedAttachments)) {
    const rm = new Set(removedPaths);
    const toPath = (a: any) => a?.storagePath || toStoragePathFromPublicUrl(String(a?.url || ''));
    normalizedAttachments = normalizedAttachments.filter((a: any) => !rm.has(toPath(a)));
  }

  // 이미지/문서 분리
  const isImageUrl = (u: string) => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(u);
  const splitByType = (atts: any[] = []) => {
    const imgs: any[] = [];
    const docs: any[] = [];
    for (const a of atts) (isImageUrl(String(a?.url)) ? imgs : docs).push(a);
    return { imgs, docs };
  };
  const { imgs, docs } = splitByType(normalizedAttachments || []);

  const patch: any = {
    ...parsed.data,
    attachments: normalizedAttachments, // 전체
    images: imgs, // 이미지만
    files: docs, // 문서만
    updatedAt: new Date(),
  };
  // content가 오면 서버에서 정제
  if (typeof patch.content === 'string') {
    patch.content = sanitizeHtml(patch.content);
  }
  // removedPaths가 오면 patch.attachments에서 해당 항목 제거(이중 안전망)
  if (removedPaths.length > 0 && Array.isArray(patch.attachments)) {
    const rm = new Set(removedPaths);
    const toPath = (a: any) => a?.storagePath || toStoragePathFromPublicUrl(String(a?.url || ''));
    patch.attachments = patch.attachments.filter((a: any) => !rm.has(toPath(a)));
  }

  // 타입별 제약
  if (post.type === 'notice') {
    // 공지에는 productRef/answer 없음만 제한
    delete patch.productRef;
    // category, isSecret, isPinned 모두 허용
  } else {
    // QnA에는 isPinned 없음
    delete patch.isPinned;
  }
  console.log('[PATCH boards]', { paramId: id, savedIdType: typeof post._id, savedId: String(post._id) });

  // 스토리지 파일 삭제 (옵션)
  if (removedPaths.length > 0) {
    const { error: delErr } = await supabaseAdmin.storage.from(STORAGE_BUCKET).remove(removedPaths);

    if (delErr) {
      // 실패해도 DB 업데이트는 진행할지 여부는 정책 결정
      console.warn('Supabase remove error:', delErr);
      // 실패 시 요청 자체를 막으려면 아래 주석을 해제:
      // return NextResponse.json({ ok: false, error: 'storage_remove_failed' }, { status: 500 });
    }
  }

  // === 강제 매칭 업데이트 (findOneAndUpdate 대신 updateOne + 재조회) ===
  const col = db.collection('board_posts');

  // post._id로 1차 시도
  let r = await col.updateOne({ _id: post._id as any }, { $set: patch });

  // 매칭이 0이면 폴백: 문자열/다시 ObjectId 변환 모두 시도
  if (!r.matchedCount) {
    const pid = String(post._id); // '68d52f...' 형태
    const oid2 = toObjectId(pid); // ObjectId 재생성

    if (oid2) {
      r = await col.updateOne({ _id: oid2 }, { $set: patch });
    }
    if (!r.matchedCount) {
      r = await col.updateOne({ _id: pid as any }, { $set: patch });
    }
  }

  // 그래도 매칭이 0이면 not_found 유지
  if (!r.matchedCount) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }
  console.log('[PATCH boards: update matchedCount]', r.matchedCount);
  console.log('PATCH payload', { attachments: normalizedAttachments, removedPaths });
  // 갱신된 문서를 다시 읽어와서 반환
  const updated = await BoardRepo.findOneById(db, String(post._id));
  return NextResponse.json({ ok: true, item: updated });
}
// ===================================================================

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const db = await getDb();
  const { id } = await params;
  const post = await BoardRepo.findOneById(db, id);

  if (!post) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  const isAdmin = payload.role === 'admin';
  const isOwner = String(payload.sub) === String(post.authorId);
  if (!isAdmin && !isOwner) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

  // 첨부가 있으면 스토리지에서 먼저 삭제
  if (Array.isArray(post.attachments) && post.attachments.length > 0) {
    const paths = post.attachments.map((a: any) => a?.storagePath || toStoragePathFromPublicUrl(String(a?.url || ''))).filter((p: string) => !!p);
    if (paths.length > 0) {
      const { error: delErr } = await supabaseAdmin.storage.from(STORAGE_BUCKET).remove(paths);
      if (delErr) console.warn('Supabase remove on DELETE error:', delErr);
    }
  }

  await BoardRepo.deleteOneById(db, id);

  return NextResponse.json({ ok: true });
}
