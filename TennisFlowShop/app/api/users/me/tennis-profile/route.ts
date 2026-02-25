import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;

/**
 * accessToken 쿠키를 읽어서 로그인된 userId를 문자열로 돌려주는 헬퍼
 * - 토큰이 없거나, 서명이 잘못됐거나, sub가 없으면 null 반환
 */
async function getAuthenticatedUserId(): Promise<string | null> {
  const jar = await cookies();
  const accessToken = jar.get('accessToken')?.value;

  if (!accessToken) return null;

  try {
    const decoded = jwt.verify(accessToken, ACCESS_TOKEN_SECRET) as JwtPayload;
    const sub = decoded.sub ?? decoded.userId ?? decoded.id;
    if (!sub) return null;
    return String(sub);
  } catch (err) {
    // 토큰 오류일 경우 null
    console.error('[API users/me/tennis-profile] token error:', err);
    return null;
  }
}

/**
 * GET /api/users/me/tennis-profile
 * - 현재 로그인한 사용자의 테니스 프로필 조회
 * - 없으면 profile: null 로 응답
 */
export async function GET() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDb();
    const profilesCol = db.collection('player_profiles');

    const doc = await profilesCol.findOne({ userId: new ObjectId(userId) });

    if (!doc) {
      // 아직 프로필을 만든 적이 없는 경우
      return NextResponse.json({
        ok: true,
        profile: null,
      });
    }

    // 안전하게 any 캐스팅 (MongoDB Document 타입 피하기 위해)
    const p: any = doc;

    return NextResponse.json({
      ok: true,
      profile: {
        id: String(p._id),
        level: p.level ?? '',
        hand: p.hand ?? '',
        playStyle: p.playStyle ?? '',
        mainRacket: {
          brand: p.mainRacket?.brand ?? '',
          model: p.mainRacket?.model ?? '',
          weight: p.mainRacket?.weight ?? '',
          balance: p.mainRacket?.balance ?? '',
        },
        mainString: {
          brand: p.mainString?.brand ?? '',
          model: p.mainString?.model ?? '',
          gauge: p.mainString?.gauge ?? '',
          material: p.mainString?.material ?? '',
          tensionMain: p.mainString?.tensionMain ?? '',
          tensionCross: p.mainString?.tensionCross ?? '',
        },
        note: p.note ?? '',
        isPublic: Boolean(p.isPublic),
        createdAt: p.createdAt ?? null,
        updatedAt: p.updatedAt ?? null,
      },
    });
  } catch (err) {
    console.error('[API users/me/tennis-profile] DB error:', err);
    return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });
  }
}

/**
 * PUT /api/users/me/tennis-profile
 * - 현재 로그인한 사용자의 테니스 프로필을 생성/업데이트 (upsert)
 * - body에 들어오는 값들은 최대한 문자열로 정규화해서 저장
 */
export async function PUT(req: NextRequest) {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // 유효성 검사
  const { level = '', hand = '', playStyle = '', mainRacket = {}, mainString = {}, note = '', isPublic = false } = body ?? {};

  const safeProfile = {
    level: String(level ?? ''),
    hand: String(hand ?? ''),
    playStyle: String(playStyle ?? ''),
    mainRacket: {
      brand: String(mainRacket?.brand ?? ''),
      model: String(mainRacket?.model ?? ''),
      weight: String(mainRacket?.weight ?? ''),
      balance: String(mainRacket?.balance ?? ''),
    },
    mainString: {
      brand: String(mainString?.brand ?? ''),
      model: String(mainString?.model ?? ''),
      gauge: String(mainString?.gauge ?? ''),
      material: String(mainString?.material ?? ''),
      tensionMain: String(mainString?.tensionMain ?? ''),
      tensionCross: String(mainString?.tensionCross ?? ''),
    },
    note: String(note ?? ''),
    isPublic: Boolean(isPublic),
  };

  const hasAnyMeaningfulValue =
    safeProfile.level ||
    safeProfile.hand ||
    safeProfile.playStyle ||
    safeProfile.note.trim() ||
    safeProfile.mainRacket.brand ||
    safeProfile.mainRacket.model ||
    safeProfile.mainString.brand ||
    safeProfile.mainString.model ||
    safeProfile.mainString.gauge ||
    safeProfile.mainString.material ||
    safeProfile.mainString.tensionMain ||
    safeProfile.mainString.tensionCross;

  // 아무것도 입력 안 한 상태면 "저장할 게 없음" 처리
  if (!hasAnyMeaningfulValue) {
    // 그냥 OK로 처리하고 아무것도 안 저장
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const db = await getDb();
    const profilesCol = db.collection('player_profiles');

    const now = new Date();
    const userObjectId = new ObjectId(userId);

    // userId 기준 upsert
    await profilesCol.updateOne(
      { userId: userObjectId },
      {
        $set: {
          userId: userObjectId,
          ...safeProfile,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API users/me/tennis-profile] DB error:', err);
    return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });
  }
}
