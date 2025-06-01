import { auth } from '@/lib/auth'; // 사용자 인증을 위한 auth 함수
import clientPromise from '@/lib/mongodb'; // MongoDB 연결 클라이언트
import bcrypt from 'bcryptjs'; // 비밀번호 해싱 및 검증을 위한 bcryptjs

// 비밀번호 변경 API (PATCH 메서드)
export async function PATCH(req: Request) {
  const session = await auth(); // 현재 로그인된 사용자 세션 정보 확인

  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 }); // 로그인되어 있지 않으면 401 반환
  }

  // 클라이언트에서 보낸 현재 비밀번호와 새 비밀번호 추출
  const { currentPassword, newPassword } = await req.json();

  const client = await clientPromise; // MongoDB 클라이언트 연결
  const db = client.db(); // DB 선택

  // 현재 로그인된 사용자의 정보를 이메일 기준으로 조회
  const user = await db.collection('users').findOne({ email: session.user.email });

  // 사용자가 없거나 해시된 비밀번호가 없다면 에러 처리
  if (!user || !user.hashedPassword) {
    return Response.json({ message: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 });
  }

  // 현재 비밀번호가 올바른지 bcrypt를 통해 확인
  const isMatch = await bcrypt.compare(currentPassword, user.hashedPassword);
  if (!isMatch) {
    return Response.json({ message: '현재 비밀번호가 올바르지 않습니다.' }, { status: 400 });
  }

  // 새 비밀번호를 bcrypt로 해싱 (보안을 위해 saltRounds = 10)
  const newHashedPassword = await bcrypt.hash(newPassword, 10);

  // 사용자 문서의 비밀번호를 새 해시값으로 업데이트
  await db.collection('users').updateOne({ email: session.user.email }, { $set: { hashedPassword: newHashedPassword } });

  // 성공 응답 반환
  return Response.json({ message: '비밀번호 변경 완료' }, { status: 200 });
}
