import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { z } from 'zod';
import { sanitizeHtml } from '@/lib/sanitize';

const answerSchema = z.object({ content: z.string().trim().min(1).max(20000) });

function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

async function mustAdmin() {
  const token = (await cookies()).get('accessToken')?.value;
  const payload = safeVerifyAccessToken(token);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

// POST
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await mustAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ ok: false, error: 'bad_id' }, { status: 400 });
  const postId = new ObjectId(id);

  let bodyRaw: unknown;
  try {
    bodyRaw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  const parsed = answerSchema.safeParse(bodyRaw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  const { content } = parsed.data;
  const clean = await sanitizeHtml(String(content || '')); // 정제

  const db = await getDb();
  const post = await db.collection('board_posts').findOne({ _id: postId });
  if (!post || post.type !== 'qna') return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  const now = new Date();
  await db.collection('board_posts').updateOne(
    { _id: postId },
    {
      $set: {
        answer: { content: clean, authorId: String(admin.sub), authorName: (admin as any).name, createdAt: now },
        updatedAt: now,
      },
    },
  );
  return NextResponse.json({ ok: true });
}

// PATCH
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await mustAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ ok: false, error: 'bad_id' }, { status: 400 });
  const postId = new ObjectId(id);

  let bodyRaw: unknown;
  try {
    bodyRaw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  const parsed = answerSchema.safeParse(bodyRaw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  const { content } = parsed.data;
  // 먼저 파싱
  const clean = await sanitizeHtml(String(content || '')); // 정제

  const db = await getDb();

  await db.collection('board_posts').updateOne({ _id: postId }, { $set: { 'answer.content': clean, 'answer.updatedAt': new Date() } });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await mustAdmin();
  if (!admin) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  const db = await getDb();
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ ok: false, error: 'bad_id' }, { status: 400 });
  await db.collection('board_posts').updateOne({ _id: new ObjectId(id) }, { $unset: { answer: '' }, $set: { updatedAt: new Date() } });
  return NextResponse.json({ ok: true });
  return NextResponse.json({ ok: true });
}
