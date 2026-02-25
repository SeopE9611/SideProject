import { auth } from '@/lib/auth'; // 사용자 인증을 위한 auth 함수
import clientPromise from '@/lib/mongodb'; // MongoDB 연결 클라이언트
import bcrypt from 'bcryptjs'; // 비밀번호 해싱 및 검증을 위한 bcryptjs
import { NextResponse } from 'next/server'; // 쿠키 삭제용 응답 객체

//  비밀번호 유효성 검사 함수 (8자 이상, 영문 + 숫자 포함)
function isPasswordValid(password: string) {
  const lengthOk = password.length >= 8; // 8자 이상
  const hasLetter = /[a-zA-Z]/.test(password); // 영문 포함 여부
  const hasNumber = /\d/.test(password); // 숫자 포함 여부
  return lengthOk && hasLetter && hasNumber;
}

// 비밀번호 변경 API (PATCH 메서드)
export async function PATCH(req: Request) {
  const session = await auth(); // 현재 로그인된 사용자 세션 정보 확인

  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 }); // 로그인되어 있지 않으면 401 반환
  }

  // 클라이언트에서 보낸 현재 비밀번호와 새 비밀번호 추출
  let body: any = null;
  try {
    body = await req.json();
  } catch (e) {
    console.error('[users/me/password] invalid json', e);
    return Response.json({ message: 'INVALID_JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return Response.json({ message: 'INVALID_BODY' }, { status: 400 });
  }

  const { currentPassword, newPassword } = body;
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return Response.json({ message: 'INVALID_INPUT' }, { status: 400 });
  }

  // 서버 측에서도 유효성 검사 진행
  if (!isPasswordValid(newPassword)) {
    return Response.json({ message: '비밀번호는 8자 이상이며, 영문과 숫자를 포함해야 합니다.' }, { status: 400 });
  }

  const client = await clientPromise; // MongoDB 클라이언트 연결
  const db = client.db(); // DB 선택

  const user = await db.collection('users').findOne({ email: session.user.email }, { projection: { _id: 1, email: 1, hashedPassword: 1, passwordMustChange: 1 } });
  if (!user) {
    return Response.json({ message: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 });
  }

  // 강제 변경 모드: 관리자 초기화 후 passwordMustChange === true
  const forceMode = user.passwordMustChange === true;

  // 일반 모드에서만 현재 비밀번호 검증
  if (!forceMode) {
    if (!user.hashedPassword) {
      return Response.json({ message: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!isMatch) {
      return Response.json({ message: '현재 비밀번호가 올바르지 않습니다.' }, { status: 400 });
    }
  }

  // 새 비밀번호를 bcrypt로 해싱 (보안을 위해 saltRounds = 10)
  const newHashedPassword = await bcrypt.hash(newPassword, 10);

  // 사용자 문서의 비밀번호를 새 해시값으로 업데이트 + 강제 플래그 해제
  await db.collection('users').updateOne(
    { email: session.user.email },
    {
      $set: {
        hashedPassword: newHashedPassword,
        passwordMustChange: false, // 강제 변경 종료
        updatedAt: new Date(),
      },
    }
  );

  // 성공 응답 + 전역 리다이렉트 플래그 쿠키 제거
  const res = NextResponse.json({ message: '비밀번호 변경 완료' }, { status: 200 });
  res.cookies.set('force_pwd_change', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // 삭제
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
