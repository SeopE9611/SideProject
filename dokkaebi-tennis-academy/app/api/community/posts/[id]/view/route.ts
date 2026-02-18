import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { createHash, randomUUID } from 'crypto';

import { getDb } from '@/lib/mongodb';
import { logInfo, reqMeta, startTimer } from '@/lib/logger';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import { baseCookie } from '@/lib/cookieOptions';

// 비로그인 뷰어를 서버에서 식별하기 위한 익명 쿠키 키
const COMMUNITY_ANON_VIEWER_COOKIE = 'communityAnonViewerId';

// 커뮤니티 조회수 디듀프 TTL (기본 30분, 최소 30분 ~ 최대 24시간 권장 범위)
const MIN_TTL_SECONDS = 60 * 30;
const MAX_TTL_SECONDS = 60 * 60 * 24;
const DEFAULT_TTL_SECONDS = 60 * 30;

// firstView(true/false) 비율 관측 윈도우(운영 이상 트래픽 탐지 기준)
const MIN_RATIO_WINDOW_SECONDS = 60;
const MAX_RATIO_WINDOW_SECONDS = 60 * 60;
const DEFAULT_RATIO_WINDOW_SECONDS = 60 * 5;

const MIN_RATIO_SAMPLE_COUNT = 1;
const MAX_RATIO_SAMPLE_COUNT = 10_000;
const DEFAULT_RATIO_SAMPLE_COUNT = 50;

type FirstViewRatioWindowState = {
  startedAtMs: number;
  total: number;
  firstViewTrueCount: number;
};

const firstViewRatioWindowState: FirstViewRatioWindowState = {
  startedAtMs: Date.now(),
  total: 0,
  firstViewTrueCount: 0,
};

// 로그인 사용자 ID 추출 (accessToken → userId)
async function getAuthUserId() {
  const jar = await cookies();
  const token = jar.get('accessToken')?.value;
  if (!token) return null;

  // 토큰 파손/만료로 verifyAccessToken이 throw 되어도 500이 아니라 "비로그인" 처리
  let payload: any = null;
  try {
    payload = verifyAccessToken(token);
  } catch {
    payload = null;
  }

  // sub는 ObjectId 문자열이어야 함 (다른 라우터들과 동일한 기준으로 정리)
  const subStr = payload?.sub ? String(payload.sub) : '';
  if (!subStr || !ObjectId.isValid(subStr)) return null;

  return subStr;
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
  return createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 24);
}

function resolveViewDedupeTtlSeconds() {
  const raw = Number(process.env.COMMUNITY_VIEW_DEDUPE_TTL_SECONDS ?? DEFAULT_TTL_SECONDS);
  if (Number.isNaN(raw) || !Number.isFinite(raw)) return DEFAULT_TTL_SECONDS;
  return Math.max(MIN_TTL_SECONDS, Math.min(MAX_TTL_SECONDS, Math.floor(raw)));
}

function resolveFirstViewRatioWindowSeconds() {
  const raw = Number(process.env.COMMUNITY_VIEW_FIRST_VIEW_RATIO_WINDOW_SECONDS ?? DEFAULT_RATIO_WINDOW_SECONDS);
  if (Number.isNaN(raw) || !Number.isFinite(raw)) return DEFAULT_RATIO_WINDOW_SECONDS;
  return Math.max(MIN_RATIO_WINDOW_SECONDS, Math.min(MAX_RATIO_WINDOW_SECONDS, Math.floor(raw)));
}

function resolveFirstViewRatioMinSamples() {
  const raw = Number(process.env.COMMUNITY_VIEW_FIRST_VIEW_RATIO_MIN_SAMPLES ?? DEFAULT_RATIO_SAMPLE_COUNT);
  if (Number.isNaN(raw) || !Number.isFinite(raw)) return DEFAULT_RATIO_SAMPLE_COUNT;
  return Math.max(MIN_RATIO_SAMPLE_COUNT, Math.min(MAX_RATIO_SAMPLE_COUNT, Math.floor(raw)));
}

/**
 * 운영 관측 로그: firstView true/false 비율 윈도우 집계
 * - 비정상 트래픽(예: dedupe 무력화, 봇 반복 호출) 탐지용 보조 지표
 * - 윈도우 종료 시점에만 요약 로그를 남겨 로그 폭증을 방지
 */
function trackFirstViewRatioLog(acquired: boolean, meta: ReturnType<typeof reqMeta>) {
  const windowSeconds = resolveFirstViewRatioWindowSeconds();
  const minSamples = resolveFirstViewRatioMinSamples();

  firstViewRatioWindowState.total += 1;
  if (acquired) firstViewRatioWindowState.firstViewTrueCount += 1;

  const nowMs = Date.now();
  const elapsedMs = nowMs - firstViewRatioWindowState.startedAtMs;
  if (elapsedMs < windowSeconds * 1000) return;

  const total = firstViewRatioWindowState.total;
  const firstViewTrueCount = firstViewRatioWindowState.firstViewTrueCount;
  const firstViewFalseCount = total - firstViewTrueCount;

  if (total >= minSamples) {
    logInfo({
      msg: 'community:view:first_view_ratio_window',
      status: 200,
      extra: {
        sampleCount: total,
        firstViewTrueCount,
        firstViewFalseCount,
        firstViewTrueRatio: Number((firstViewTrueCount / total).toFixed(4)),
        firstViewFalseRatio: Number((firstViewFalseCount / total).toFixed(4)),
        windowSeconds,
      },
      ...meta,
    });
  }

  firstViewRatioWindowState.startedAtMs = nowMs;
  firstViewRatioWindowState.total = 0;
  firstViewRatioWindowState.firstViewTrueCount = 0;
}

/**
 * 조회수 디듀프 슬롯 획득
 * - (postId, viewerKey) 유니크 정책에 따라 최초 1회만 true
 * - TTL 인덱스로 문서가 만료된 뒤에는 다시 true를 받을 수 있음
 */
async function tryAcquireViewSlot(db: any, postId: ObjectId, viewerKey: string, ttlSeconds: number) {
  const dedupeCol = db.collection('community_post_view_dedupe');

  // 인덱스 보장은 부팅 시점 ensureBoardIndexes에서 처리한다.
  // 라우트에서는 런타임 createIndex를 수행하지 않고 슬롯 삽입/중복 판정만 담당한다.

  const now = new Date();
  const expireAt = new Date(now.getTime() + ttlSeconds * 1000);

  try {
    await dedupeCol.insertOne({
      postId,
      viewerKey,
      createdAt: now,
      expireAt,
    });
    return true;
  } catch (e: any) {
    if (e?.code === 11000) return false;
    throw e;
  }
}

// 조회수 +1 전용 API
// POST /api/community/posts/:id/view
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const stop = startTimer();
  const meta = reqMeta(req);
  const { id } = await ctx.params;

  const db = await getDb();
  const col = db.collection('community_posts');
  const ttlSeconds = resolveViewDedupeTtlSeconds();

  // ObjectId 유효성 체크
  if (!ObjectId.isValid(id)) {
    logInfo({
      msg: 'community:view:invalid_id',
      status: 404,
      durationMs: stop(),
      extra: { id },
      ...meta,
    });
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const _id = new ObjectId(id);

  // 글 존재 여부 확인
  const post = await col.findOne({ _id });
  if (!post) {
    logInfo({
      msg: 'community:view:not_found',
      status: 404,
      durationMs: stop(),
      extra: { id },
      ...meta,
    });
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  // 로그인 사용자 여부 확인
  const userId = await getAuthUserId();
  const cookieStore = await cookies();

  /**
   * viewerKey 생성 정책
   * 1) 로그인: u:{userId}
   * 2) 비로그인: 익명쿠키 우선 + (없으면 ip+ua hash)
   * 3) 로그인/비로그인 모두 동일한 community_post_view_dedupe 컬렉션에 저장
   *    - 익명쿠키가 없을 때는 서버가 발급하여 다음 요청부터 안정적으로 재사용
   */
  let anonViewerCookieToSet: string | null = null;
  const viewerKey = (() => {
    if (userId) return `u:${String(userId)}`;

    const anonId = cookieStore.get(COMMUNITY_ANON_VIEWER_COOKIE)?.value;
    if (anonId) return `g:anon:${anonId}`;

    const generatedAnonId = randomUUID();
    anonViewerCookieToSet = generatedAnonId;
    const ipUaHash = getIpUaHash(req);
    return `g:ipua:${ipUaHash}:anon:${generatedAnonId}`;
  })();

  // 서버에서 디듀프 슬롯 획득 시에만 실제 조회수 +1 (클라이언트 localStorage는 UX 최적화 용도)
  const acquired = await tryAcquireViewSlot(db, _id, viewerKey, ttlSeconds);
  if (acquired) {
    await col.updateOne({ _id }, { $inc: { views: 1 }, $set: { updatedAt: new Date() } });
  }

  // 최신 조회수 다시 읽기
  const latest = await col.findOne({ _id });
  const views = (latest as any)?.views ?? (post as any)?.views ?? 0;

  logInfo({
    msg: acquired ? 'community:view:counted' : 'community:view:deduped',
    status: 200,
    durationMs: stop(),
    extra: {
      id,
      userId: userId ? String(userId) : null,
      viewerType: userId ? 'member' : 'guest',
      firstView: acquired,
      ttlSeconds,
      views,
    },
    ...meta,
  });

  // 운영 관측용 firstView true/false 비율 집계 로그(윈도우 종료 시 요약 출력)
  trackFirstViewRatioLog(acquired, meta);

  const response = NextResponse.json(
    { ok: true, views, firstView: acquired },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );

  // 익명 쿠키가 없던 비로그인 사용자라면 서버가 발급해 이후 요청의 안정적 디듀프 키로 활용
  if (anonViewerCookieToSet) {
    response.cookies.set(COMMUNITY_ANON_VIEWER_COOKIE, anonViewerCookieToSet, {
      ...baseCookie,
      maxAge: ttlSeconds,
    });
  }

  return response;
}
