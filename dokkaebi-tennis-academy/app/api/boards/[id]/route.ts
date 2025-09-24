import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { z } from 'zod';

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
});

function canEdit(payload: any, post: any) {
  const isAdmin = payload?.role === 'admin';
  const isOwner = String(payload?.sub || '') === String(post.authorId || '');
  return isAdmin || isOwner;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = await getDb();
  const { id } = await params;

  const post = await db.collection('board_posts').findOne({ _id: new ObjectId(id) });
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
      await db.collection('board_posts').updateOne({ _id: new ObjectId(id) }, { $inc: { viewCount: 1 } });
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
  const post = await db.collection('board_posts').findOne({ _id: new ObjectId(id) });
  if (!post) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  if (!canEdit(payload, post)) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

  const bodyRaw = await req.json();
  const parsed = updateSchema.safeParse(bodyRaw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });

  const patch = { ...parsed.data, updatedAt: new Date() } as any;
  // 타입별 제약
  if (post.type === 'notice') {
    // 공지에는 isSecret/productRef/category/answer 없음
    delete patch.isSecret;
    delete patch.productRef;
    delete patch.category;
  } else {
    // QnA에는 isPinned 없음
    delete patch.isPinned;
  }

  await db.collection('board_posts').updateOne({ _id: new ObjectId(id) }, { $set: patch });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const db = await getDb();
  const { id } = await params;
  const post = await db.collection('board_posts').findOne({ _id: new ObjectId(id) });
  if (!post) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  const isAdmin = payload.role === 'admin';
  const isOwner = String(payload.sub) === String(post.authorId);
  if (!isAdmin && !isOwner) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

  await db.collection('board_posts').deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ ok: true });
}
