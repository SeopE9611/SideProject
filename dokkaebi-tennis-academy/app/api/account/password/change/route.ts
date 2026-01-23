import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { ObjectId } from 'mongodb';

// POST /api/account/password/change
export async function POST(req: Request) {
  try {
    // 1) 인증된 사용자 식별
    const jar = await cookies();
    const at = jar.get('accessToken')?.value;
    if (!at) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    // 토큰 검증은 throw 가능하므로 401로 정리
    let payload: any = null;
    try {
      payload = verifyAccessToken(at);
    } catch {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (!payload?.sub) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const subStr = String(payload.sub);
    if (!ObjectId.isValid(subStr)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    // 2) 입력 파싱/검증
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: 'invalid_json' }, { status: 400 });
    }
    const { newPassword } = body ?? {};
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ message: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 });
    }

    // 3) 해시 생성
    const hash = await bcrypt.hash(newPassword, 10);

    // 4) DB 업데이트: 비번 교체 + 플래그 해제
    const db = await getDb();
    const _id = new ObjectId(subStr);
    const r = await db.collection('users').updateOne(
      { _id },
      {
        $set: {
          passwordHash: hash,
          passwordMustChange: false, // 강제 변경 종료
          updatedAt: new Date(),
        },
      },
    );

    if (!r.matchedCount) {
      return NextResponse.json({ message: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 5) (선택) 감사 로그 저장 – 이미 공용 appendAudit가 있다면 그걸 사용
    try {
      await db.collection('audits').insertOne({
        type: 'password_change',
        actorId: _id,
        targetId: _id,
        ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        ua: req.headers.get('user-agent') ?? null,
        createdAt: new Date(),
      });
    } catch {
      // 감사 실패는 본 로직을 막지는 않음
    }

    // 6) (선택) 토큰 리프레시
    //  - 보안상 비번 변경 후 기존 refresh 토큰 무효화/재발급을 권장하지만
    //    현재 구조를 크게 흔들지 않기 위해 여기서는 생략.
    //    필요 시 /api/refresh 로 클라이언트에서 재요청하도록 안내 가능.

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ message: '서버 오류' }, { status: 500 });
  }
}
