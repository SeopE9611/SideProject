import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sanitizeHtml } from '@/lib/sanitize';
import { logError, logInfo, reqMeta, startTimer } from '@/lib/logger';
import { API_VERSION } from '@/lib/board.repository';
import { baseCookie } from '@/lib/cookieOptions';
import { createHash } from 'crypto';
import { resolveBoardViewerContext } from '@/lib/board-secret-policy';
import { classifyBoardPatchFailure } from '@/lib/boards-patch-conflict';
import { requireAdmin } from '@/lib/admin.guard';
import { appendAdminAudit } from '@/lib/admin/appendAdminAudit';

// supabase 상수/핼퍼
const STORAGE_BUCKET = 'tennis-images';

// 비로그인 사용자 조회 중복 방지용(익명 식별자)
const ANON_VIEWER_COOKIE = 'anonViewerId';

function toStoragePathFromPublicUrl(url: string) {
  // 예: https://.../storage/v1/object/public/<bucket>/<path>
  const m = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  return m ? m[1] : '';
}
// 관리자 확인 헬퍼
function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

function getClientIp(req: NextRequest) {
  // Vercel/프록시 환경: x-forwarded-for가 가장 흔함(쉼표로 여러 값이 올 수 있어 첫 번째를 사용)
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || '';
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '';
}

function getIpUaHash(req: NextRequest) {
  const ip = getClientIp(req);
  const ua = req.headers.get('user-agent') ?? '';
  // IP가 비어도(로컬/특정 환경) UA 기반으로는 최소한의 안정성 유지
  return createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 16);
}

/**
 * same-origin 하드닝(익명 사용자에만 적용)
 * - 브라우저가 보내는 헤더(Sec-Fetch-Site / Origin / Referer)로 "동일 출처" 요청인지 대략 판별
 * - 완벽한 보안 장치는 아니지만, 외부에서 URL만 두드려 조회수 트리거하는 난이도를 올려줌
 */
function isLikelySameOriginRequest(req: NextRequest) {
  const fetchSite = req.headers.get('sec-fetch-site');
  if (fetchSite === 'same-origin' || fetchSite === 'same-site') return true;

  const host = req.headers.get('host') ?? '';
  const origin = req.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host === host) return true;
    } catch {}
  }

  const referer = req.headers.get('referer');
  if (referer) {
    try {
      if (new URL(referer).host === host) return true;
    } catch {}
  }

  return false;
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
      }),
    )
    .optional(),
});

function canEdit({ viewerId, isAdmin }: { viewerId?: string | null; isAdmin: boolean }, post: any) {
  const isOwner = String(viewerId || '') === String(post.authorId || '');
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

  /**
   * 조회수 중복 방지(30분)
   * - (postId, viewerKey) 유니크 인덱스가 존재한다는 전제에서,
   *   insert 성공이면 "이번 요청은 조회수 증가 허용"으로 판단
   * - 중복(11000)이면 "이미 30분 내에 본 적 있음"으로 판단하여 증가를 막는다.
   */
  async tryAcquireViewSlot(db: any, postId: string, viewerKey: string) {
    const col = db.collection('board_view_dedupe');
    try {
      await col.insertOne({
        postId: String(postId),
        viewerKey,
        createdAt: new Date(),
      });
      return true;
    } catch (e: any) {
      // Mongo duplicate key error
      if (e?.code === 11000) return false;
      throw e;
    }
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const stop = startTimer();
  const meta = reqMeta(req);
  const db = await getDb();
  const { id } = await params;

  const post = await BoardRepo.findOneById(db, id);
  if (!post) {
    logInfo({ msg: 'boards:get:not_found', status: 404, docId: id, durationMs: stop(), ...meta });
    return NextResponse.json({ ok: false, version: API_VERSION, error: 'not_found' }, { status: 404 });
  }
  // 권한 확인 + (비로그인 디듀프용) 쿠키 접근
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  const viewer = await resolveBoardViewerContext({
    accessToken: token,
    verifyToken: verifyAccessToken,
    fetchUserRoleById: async (userId) => {
      if (!ObjectId.isValid(userId)) return null;
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) }, { projection: { role: 1 } });
      return typeof user?.role === 'string' ? user.role : null;
    },
  });
  const payload = viewer.payload;
  const isAdmin = viewer.isAdmin;
  const isOwner = viewer.viewerId && String(viewer.viewerId) === String(post.authorId);

  // 비밀글: 권한 없으면 401/403로 명확하게 반환
  if (post.isSecret) {
    // 로그인 자체가 없으면 -> 401 (로그인 유도 UX)
    if (!payload) {
      logInfo({ msg: 'boards:get:unauthorized_secret', status: 401, docId: id, durationMs: stop(), ...meta });
      return NextResponse.json({ ok: false, version: API_VERSION, error: { code: 'unauthorized', message: 'Unauthorized' } }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }
    // 로그인은 했지만 작성자/관리자가 아니면 -> 403
    if (!isAdmin && !isOwner) {
      logInfo({
        msg: 'boards:get:forbidden_secret',
        status: 403,
        docId: id,
        userId: String(viewer.viewerId ?? ''),
        durationMs: stop(),
        ...meta,
      });
      return NextResponse.json({ ok: false, version: API_VERSION, error: { code: 'forbidden', message: 'Forbidden' } }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }
  }

  logInfo({ msg: 'boards:get:ok', status: 200, docId: id, durationMs: stop(), ...meta });
  const response = NextResponse.json({ ok: true, version: API_VERSION, item: post }, { headers: { 'Cache-Control': 'no-store' } });

  return response;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const stop = startTimer();
  const meta = reqMeta(req);
  const token = (await cookies()).get('accessToken')?.value;
  const db = await getDb();
  const { id } = await params;

  const payload = safeVerifyAccessToken(token);
  if (!payload) {
    logInfo({ msg: 'boards:patch:unauthorized', status: 401, docId: id, durationMs: stop(), ...meta });
    return NextResponse.json({ ok: false, version: API_VERSION, error: { code: 'unauthorized', message: 'Unauthorized' } }, { status: 401 });
  }

  const post = await BoardRepo.findOneById(db, id);
  if (!post) {
    logInfo({ msg: 'boards:patch:not_found', status: 404, docId: id, userId: String(payload.sub), durationMs: stop(), ...meta });
    return NextResponse.json({ ok: false, version: API_VERSION, error: 'not_found' }, { status: 404 });
  }
  const isOwner = String(payload?.sub || '') === String(post.authorId || '');
  let isAdmin = false;
  if (!isOwner) {
    const guard = await requireAdmin(req);
    if (!guard.ok) {
      logInfo({ msg: 'boards:patch:forbidden', status: guard.res.status, docId: id, userId: String(payload.sub), durationMs: stop(), ...meta });
      return guard.res;
    }
    isAdmin = true;
  }

  if (!canEdit({ viewerId: String(payload?.sub || ''), isAdmin }, post)) {
    logInfo({ msg: 'boards:patch:forbidden', status: 403, docId: id, userId: String(payload.sub), durationMs: stop(), ...meta });
    return NextResponse.json({ ok: false, version: API_VERSION, error: { code: 'forbidden', message: 'Forbidden' } }, { status: 403 });
  }

  let bodyRaw: unknown;
  try {
    bodyRaw = await req.json();
  } catch {
    logInfo({ msg: 'boards:patch:invalid_json', status: 400, docId: id, durationMs: stop(), ...meta });
    return NextResponse.json({ ok: false, version: API_VERSION, message: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(bodyRaw);
  if (!parsed.success) {
    logInfo({ msg: 'boards:patch:validation_failed', status: 400, docId: id, userId: String(payload.sub), durationMs: stop(), extra: { issues: parsed.error.issues }, ...meta });
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

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
    patch.content = await sanitizeHtml(patch.content);
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
  // 운영 노이즈/내부 식별자 노출 방지: 개발 환경에서만
  if (process.env.NODE_ENV === 'development') {
    console.log('[PATCH boards]', { paramId: id, savedIdType: typeof post._id, savedId: String(post._id) });
  }

  // 스토리지 파일 삭제 (옵션)
  if (removedPaths.length > 0) {
    const { error: delErr } = await supabaseAdmin.storage.from(STORAGE_BUCKET).remove(removedPaths);

    if (delErr) {
      // 실패해도 DB 업데이트는 진행할지 여부는 정책 결정
      logError({ msg: 'boards:patch:storage_remove_failed', status: 200, docId: id, userId: String(payload.sub), durationMs: stop(), extra: { removedPaths }, error: delErr, ...meta });
      // 실패 시 요청 자체를 막으려면 아래 주석을 해제:
      // return NextResponse.json({ ok: false, error: 'storage_remove_failed' }, { status: 500 });
    }
  }

  // === 낙관적 락(updatedAt 매칭) + 재조회 반환 시작 ===

  // 0) 클라이언트가 마지막으로 본 updatedAt(선택) 추출
  //    - 헤더: If-Unmodified-Since
  //    - 바디: clientSeenDate (권장), ifUnmodifiedSince (하위 호환)
  const ifUnmodifiedSinceHeader = req.headers.get('if-unmodified-since');
  const clientSeenDateBody = (bodyRaw as any)?.clientSeenDate;
  const ifUnmodifiedSinceBody = (bodyRaw as any)?.ifUnmodifiedSince;
  const clientSeenAtRaw = clientSeenDateBody ?? ifUnmodifiedSinceBody ?? ifUnmodifiedSinceHeader ?? null;

  let clientSeenDate: Date | null = null;
  if (typeof clientSeenAtRaw === 'string') {
    const d = new Date(clientSeenAtRaw);
    if (!Number.isNaN(d.getTime())) clientSeenDate = d;
  }

  // 1) 낙관적 락이 켜져 있을 때 사용할 필터 빌더
  const buildFilter = (idFilter: any) => {
    if (clientSeenDate) {
      // 클라이언트가 본 updatedAt과 DB의 updatedAt이 같아야만 매칭
      return { ...idFilter, updatedAt: clientSeenDate };
    }
    return idFilter; // 기준시각 없으면 종전대로 동작(락 미적용)
  };

  const col = db.collection('board_posts');

  // 2) 1차: post._id(any)로 시도
  let r = await col.updateOne(buildFilter({ _id: post._id as any }), { $set: patch });

  // 3) 매칭 실패 시 폴백: ObjectId / string 각각 시도(락 조건은 계속 유지)
  if (!r.matchedCount) {
    const pid = String(post._id);
    const oid2 = toObjectId(pid);
    if (oid2) {
      r = await col.updateOne(buildFilter({ _id: oid2 }), { $set: patch });
    }
    if (!r.matchedCount) {
      r = await col.updateOne(buildFilter({ _id: pid as any }), { $set: patch });
    }
  }

  // 4) 여전히 실패면: 실제 삭제(not_found)와 동시 수정(conflict) 분기
  if (!r.matchedCount) {
    const postStillExists = !!(await BoardRepo.findOneById(db, String(post._id)));
    const failure = classifyBoardPatchFailure({
      hasClientSeenDate: !!clientSeenDate,
      postStillExists,
    });

    if (failure === 'conflict') {
      logInfo({ msg: 'boards:patch:conflict', status: 409, docId: id, userId: String(payload.sub), durationMs: stop(), ...meta });
      return NextResponse.json({ ok: false, version: API_VERSION, error: 'conflict' }, { status: 409 });
    }

    logInfo({ msg: 'boards:patch:not_found_on_update', status: 404, docId: id, userId: String(payload.sub), durationMs: stop(), ...meta });
    return NextResponse.json({ ok: false, version: API_VERSION, error: 'not_found' }, { status: 404 });
  }

  // console.log('[PATCH boards: update matchedCount]', r.matchedCount);
  // console.log('PATCH payload', { attachments: normalizedAttachments, removedPaths });
  // logInfo({
  //   msg: 'boards:patch:update_ok',
  //   status: 200,
  //   docId: id,
  //   userId: String(payload.sub),
  //   durationMs: stop(),
  //   extra: { matchedCount: r.matchedCount, removedPathsCount: removedPaths.length, attachmentsCount: (normalizedAttachments || []).length },
  //   ...meta,
  // });

  // 5) 갱신된 문서를 다시 읽어와서 반환(+선택: 최신 updatedAt 헤더 제공)
  const updated = await BoardRepo.findOneById(db, String(post._id));

  // 관리자 액션 감사 로그(상태 변경 중심)
  if (parsed.data.status && parsed.data.status !== post.status) {
    await appendAdminAudit(
      db,
      {
        type: 'admin_board_status_change',
        actorId: payload.sub,
        targetId: String(post._id),
        message: `게시물 상태 변경: ${String(post.status ?? 'unknown')} -> ${parsed.data.status}`,
        diff: {
          postId: String(post._id),
          postType: String(post.type ?? ''),
          title: String(post.title ?? ''),
          beforeStatus: String(post.status ?? ''),
          afterStatus: parsed.data.status,
        },
      },
      req,
    );
  }

  return NextResponse.json({ ok: true, version: API_VERSION, item: updated }, updated?.updatedAt ? { headers: { 'x-updated-at': new Date(updated.updatedAt).toISOString() } } : undefined);
  // === 낙관적 락(updatedAt 매칭) + 재조회 반환 끝 ===
}
// ===================================================================

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const stop = startTimer();
  const meta = reqMeta(req);
  const token = (await cookies()).get('accessToken')?.value;
  const db = await getDb();
  const { id } = await params;

  const payload = safeVerifyAccessToken(token);
  if (!payload) {
    logInfo({ msg: 'boards:delete:unauthorized', status: 401, docId: id, durationMs: stop(), ...meta });
    return NextResponse.json({ ok: false, version: API_VERSION, error: { code: 'unauthorized', message: 'Unauthorized' } }, { status: 401 });
  }

  const post = await BoardRepo.findOneById(db, id);
  if (!post) {
    logInfo({ msg: 'boards:delete:not_found', status: 404, docId: id, userId: String(payload.sub), durationMs: stop(), ...meta });
    return NextResponse.json({ ok: false, version: API_VERSION, error: 'not_found' }, { status: 404 });
  }
  const isOwner = String(payload.sub) === String(post.authorId);
  if (!isOwner) {
    const guard = await requireAdmin(req);
    if (!guard.ok) return guard.res;
  }

  // 첨부가 있으면 스토리지에서 먼저 삭제
  if (Array.isArray(post.attachments) && post.attachments.length > 0) {
    const paths = post.attachments.map((a: any) => a?.storagePath || toStoragePathFromPublicUrl(String(a?.url || ''))).filter((p: string) => !!p);
    if (paths.length > 0) {
      const { error: delErr } = await supabaseAdmin.storage.from(STORAGE_BUCKET).remove(paths);
      if (delErr) logError({ msg: 'boards:delete:storage_remove_failed', status: 200, docId: id, userId: String(payload.sub), durationMs: stop(), error: delErr, extra: { paths }, ...meta });
    }
  }

  await BoardRepo.deleteOneById(db, id);

  await appendAdminAudit(
    db,
    {
      type: 'admin_board_delete',
      actorId: payload.sub,
      targetId: String(post._id),
      message: '게시물 삭제',
      diff: {
        postId: String(post._id),
        postType: String(post.type ?? ''),
        status: String(post.status ?? ''),
        title: String(post.title ?? ''),
      },
    },
    req,
  );

  logInfo({ msg: 'boards:delete:ok', status: 200, docId: id, userId: String(payload.sub), durationMs: stop(), ...meta });
  return NextResponse.json({ ok: true, version: API_VERSION });
}
