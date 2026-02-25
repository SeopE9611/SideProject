import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { createHash } from 'crypto';

import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { logInfo, reqMeta, startTimer } from '@/lib/logger';
import { API_VERSION } from '@/lib/board.repository';

/** 토큰이 깨져도 500이 아니라 "비로그인"으로 처리 */
function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

function toObjectId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

function getClientIp(req: NextRequest) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || '';
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '';
}

function getIpUaHash(req: NextRequest) {
  const ip = getClientIp(req);
  const ua = req.headers.get('user-agent') ?? '';
  return createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 16);
}

/**
 * same-origin 하드닝(익명 사용자에만 적용)
 * - 외부에서 URL만 두드려 조회수 조작하는 난이도를 올림
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

/** board_posts 조회/업데이트는 기존 boards/[id]/route.ts 패턴과 동일하게 */
const BoardRepo = {
  async findOneById(db: any, id: string) {
    const col = db.collection('board_posts');
    const oid = toObjectId(id);
    if (oid) {
      const doc = await col.findOne({ _id: oid });
      if (doc) return doc;
    }
    // TS가 _id에 string을 싫어하므로 제한적으로 any 캐스팅(기존 파일과 동일)
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
      if (e?.code === 11000) return false; // 중복키 = 30분 내 재조회
      throw e;
    }
  },
};

// POST /api/boards/:id/view
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const stop = startTimer();
  const meta = reqMeta(req);
  const { id } = await ctx.params;

  const db = await getDb();
  const post = await BoardRepo.findOneById(db, id);

  if (!post) {
    logInfo({
      msg: 'boards:view:not_found',
      status: 404,
      docId: id,
      durationMs: stop(),
      ...meta,
    });
    return NextResponse.json({ ok: false, version: API_VERSION, error: 'not_found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  // 권한 확인 (비밀글이면 view도 권한 필요)
  const jar = await cookies();
  const token = jar.get('accessToken')?.value;
  const payload = safeVerifyAccessToken(token);

  const isAdmin = payload?.role === 'admin';
  const isOwner = payload?.sub && String(payload.sub) === String(post.authorId);

  if (post.isSecret) {
    if (!payload) {
      logInfo({
        msg: 'boards:view:unauthorized_secret',
        status: 401,
        docId: id,
        durationMs: stop(),
        ...meta,
      });
      return NextResponse.json({ ok: false, version: API_VERSION, error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }
    if (!isAdmin && !isOwner) {
      logInfo({
        msg: 'boards:view:forbidden_secret',
        status: 403,
        docId: id,
        userId: String(payload.sub ?? ''),
        durationMs: stop(),
        ...meta,
      });
      return NextResponse.json({ ok: false, version: API_VERSION, error: 'forbidden' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }
  }

  // published만 카운트
  const current = typeof post.viewCount === 'number' ? post.viewCount : 0;
  if (post.status !== 'published') {
    return NextResponse.json({ ok: true, version: API_VERSION, firstView: false, viewCount: current }, { headers: { 'Cache-Control': 'no-store' } });
  }

  // viewerKey 결정
  let viewerKey: string | null = null;
  if (payload?.sub) {
    viewerKey = `u:${String(payload.sub)}`;
  } else {
    if (isLikelySameOriginRequest(req)) {
      viewerKey = `ipua:${getIpUaHash(req)}`;
    }
  }

  if (!viewerKey) {
    return NextResponse.json({ ok: true, version: API_VERSION, firstView: false, viewCount: current }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const acquired = await BoardRepo.tryAcquireViewSlot(db, id, viewerKey);
  if (acquired) {
    await BoardRepo.incViewCount(db, id);
  }

  const viewCount = acquired ? current + 1 : current;

  logInfo({
    msg: 'boards:view:ok',
    status: 200,
    docId: id,
    durationMs: stop(),
    extra: { firstView: acquired, viewCount },
    ...meta,
  });

  return NextResponse.json({ ok: true, version: API_VERSION, firstView: acquired, viewCount }, { headers: { 'Cache-Control': 'no-store' } });
}
