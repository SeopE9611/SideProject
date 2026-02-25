import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { z } from 'zod';
import { verifyCommunityCsrf } from '@/lib/community/security';
import { sanitizeHtml } from '@/lib/sanitize';
import { API_VERSION } from '@/lib/board.repository';
import { requireAdmin } from '@/lib/admin.guard';

const answerSchema = z.object({ content: z.string().trim().min(1).max(20000) });

// POST
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {

  const csrf = verifyCommunityCsrf(req);
  if (!csrf.ok) {
    return csrf.response;
  }
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ ok: false, version: API_VERSION, error: 'bad_id' }, { status: 400 });
  const postId = new ObjectId(id);

  let bodyRaw: unknown;
  try {
    bodyRaw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, version: API_VERSION, error: 'invalid_json' }, { status: 400 });
  }
  const parsed = answerSchema.safeParse(bodyRaw);
  if (!parsed.success) return NextResponse.json({ ok: false, version: API_VERSION, error: 'invalid_body' }, { status: 400 });
  const { content } = parsed.data;
  const clean = await sanitizeHtml(String(content || '')); // 정제

  const db = await getDb();
  const post = await db.collection('board_posts').findOne({ _id: postId });
  if (!post || post.type !== 'qna') return NextResponse.json({ ok: false, version: API_VERSION, error: 'not_found' }, { status: 404 });

  const now = new Date();
  await db.collection('board_posts').updateOne(
    { _id: postId },
    {
      $set: {
        answer: { content: clean, authorId: String(guard.admin._id), authorName: guard.admin.name, createdAt: now },
        updatedAt: now,
      },
    },
  );
  return NextResponse.json({ ok: true, version: API_VERSION });
}

// PATCH
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {

  const csrf = verifyCommunityCsrf(req);
  if (!csrf.ok) {
    return csrf.response;
  }
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ ok: false, version: API_VERSION, error: 'bad_id' }, { status: 400 });
  const postId = new ObjectId(id);

  let bodyRaw: unknown;
  try {
    bodyRaw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, version: API_VERSION, error: 'invalid_json' }, { status: 400 });
  }
  const parsed = answerSchema.safeParse(bodyRaw);
  if (!parsed.success) return NextResponse.json({ ok: false, version: API_VERSION, error: 'invalid_body' }, { status: 400 });
  const { content } = parsed.data;
  // 먼저 파싱
  const clean = await sanitizeHtml(String(content || '')); // 정제

  const db = await getDb();

  await db.collection('board_posts').updateOne({ _id: postId }, { $set: { 'answer.content': clean, 'answer.updatedAt': new Date() } });

  return NextResponse.json({ ok: true, version: API_VERSION });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {

  const csrf = verifyCommunityCsrf(_req);
  if (!csrf.ok) {
    return csrf.response;
  }
  const guard = await requireAdmin(_req);
  if (!guard.ok) return guard.res;
  const db = await getDb();
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ ok: false, version: API_VERSION, error: 'bad_id' }, { status: 400 });
  await db.collection('board_posts').updateOne({ _id: new ObjectId(id) }, { $unset: { answer: '' }, $set: { updatedAt: new Date() } });
  return NextResponse.json({ ok: true, version: API_VERSION });
}
