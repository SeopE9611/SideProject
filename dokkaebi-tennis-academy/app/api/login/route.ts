import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getUserByEmail, verifyPassword } from '@/lib/user-service';
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } from '@/lib/constants';
import { getDb } from '@/lib/mongodb';
import { autoLinkStringingByEmail } from '@/lib/claims';
import { baseCookie } from '@/lib/cookieOptions';
import { ADMIN_CSRF_COOKIE_KEY } from '@/lib/admin/adminCsrf';
import { z } from 'zod';

// // JWT 비밀 키 불러오기 (환경 변수에서 설정)
// const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
// const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!;

// // 토큰 만료 시간 설정
// const ACCESS_TOKEN_EXPIRES_IN = 60 * 60; // AccessToken: 1시간 (3600초)
// const REFRESH_TOKEN_EXPIRES_IN = 60 * 60 * 24 * 7; // RefreshToken: 7일

/**
 * 서버(라우터) 최종 유효성 검사
 * - 목적: (1) 잘못된 타입/값 요청을 400으로 명확히 차단, (2) 추후 필드 추가 시 기준점 제공
 */
const LoginBodySchema = z.object({
  email: z
    .string()
    .trim()
    .min(1)
    .email()
    // 로그인은 대소문자 무시 처리(기존 getUserByEmail과 동일한 기대)
    .transform((v) => v.toLowerCase()),
  // 최소한 "빈 문자열"은 차단. (길이 제한은 정책에 따라 추후 강화 가능)
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: '요청 본문(JSON)이 올바르지 않습니다.' }, { status: 400 });
  }

  const parsed = LoginBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: '이메일 또는 비밀번호 형식을 확인해주세요.' }, { status: 400 });
  }

  const { email, password } = parsed.data;

  // 사용자 조회 + 비밀번호 검증
  const user = await getUserByEmail(email);
  const isValid = user?.hashedPassword && (await verifyPassword(password, user.hashedPassword));

  if (!isValid) {
    return NextResponse.json({ error: '이메일 또는 비밀번호가 일치하지 않습니다.' }, { status: 401 });
  }

  if (user.isDeleted) return NextResponse.json({ error: '탈퇴한 계정입니다.' }, { status: 403 });
  if (user.isSuspended) return NextResponse.json({ error: '비활성화된 계정입니다.' }, { status: 403 });

  // AccessToken 생성 (payload, 시크릿 키, 옵션)
  const accessToken = jwt.sign(
    {
      sub: user._id.toString(), // JWT의 subject: 고유 식별자 (_id 사용)
      email: user.email,
      role: user.role, // 사용자 권한 정보 (예: 'admin', 'user')
    },
    ACCESS_TOKEN_SECRET, // 비밀 키
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN, // 만료 시간 (초 단위)
    },
  );

  // RefreshToken 생성 (payload 최소화: user ID만 사용)
  const refreshToken = jwt.sign(
    {
      sub: user._id.toString(), // subject에만 사용자 고유 ID 저장
    },
    REFRESH_TOKEN_SECRET, // 별도 비밀 키
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN, // 7일 유효
    },
  );

  // JSON 응답: 토큰은 쿠키로만 전달하므로 success만 반환
  const response = NextResponse.json({ success: true });

  response.cookies.set('accessToken', accessToken, {
    ...baseCookie,
    maxAge: ACCESS_TOKEN_EXPIRES_IN,
  });

  response.cookies.set('refreshToken', refreshToken, {
    ...baseCookie,
    maxAge: REFRESH_TOKEN_EXPIRES_IN,
  });

  /**
   * 관리자 세션에서만 CSRF 더블서브밋 쿠키를 발급한다.
   * - admin: 클라이언트 JS가 읽어 헤더로 보낼 수 있어야 하므로 httpOnly=false
   * - non-admin: 이전 관리자 토큰이 남아있지 않도록 즉시 삭제
   */
  if (user.role === 'admin') {
    const adminCsrfToken = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');
    response.cookies.set(ADMIN_CSRF_COOKIE_KEY, adminCsrfToken, {
      ...baseCookie,
      httpOnly: false,
      maxAge: REFRESH_TOKEN_EXPIRES_IN,
    });
  } else {
    response.cookies.set(ADMIN_CSRF_COOKIE_KEY, '', {
      ...baseCookie,
      httpOnly: false,
      maxAge: 0,
    });
  }

  // 로그인 대상 유저 문서: 위에서 const user = await getUserByEmail(email) 로 조회됨
  if (user?.passwordMustChange === true) {
    // 로그인 직후 전역 리다이렉트를 트리거하는 HttpOnly 쿠키
    response.cookies.set('force_pwd_change', '1', {
      ...baseCookie,
      maxAge: 60 * 10, // 10분 (원하면 더 길게)
    });
  } else {
    // 혹시 남아있던 플래그 쿠키는 제거
    response.cookies.delete('force_pwd_change');
  }

  // 토큰 쿠키 세팅 직후, 자동 귀속 + 최근 로그인 기록
  try {
    const db = await getDb();

    // 최근 로그인 장치 기록
    try {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || ''; // 배포환경에 맞춰 하나는 잡혀요
      const ua = req.headers.get('user-agent') || '';

      await db.collection('user_sessions').insertOne({
        userId: user._id, // ObjectId 그대로
        at: new Date(),
        ip,
        ua,
      });
    } catch (e) {
      console.warn('[login] session log fail', e);
    }

    await Promise.all([
      // (db, userId, email) 순서로 통일
      autoLinkStringingByEmail(db, user._id, user.email),
      db.collection('users').updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } }),
    ]);
  } catch (e) {
    console.warn('[login] post-login side effects fail:', e);
  }

  return response;
}
