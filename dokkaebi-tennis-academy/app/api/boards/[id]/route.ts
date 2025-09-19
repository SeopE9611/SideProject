import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  content: z.string().trim().min(2).max(20000).optional(),
  category: z.enum(['일반문의', '상품문의']).optional(),
  productRef: z.object({ productId: z.string(), name: z.string().optional(), image: z.string().url().nullable().optional() }).optional(),
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

  // 비밀글 마스킹: 작성자/관리자 외에는 본문/첨부 제거
  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  const isAdmin = payload?.role === 'admin';
  const isOwner = payload?.sub && String(payload.sub) === String(post.authorId);
  if (post.isSecret && !isAdmin && !isOwner) {
    delete (post as any).content;
    delete (post as any).attachments;
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
