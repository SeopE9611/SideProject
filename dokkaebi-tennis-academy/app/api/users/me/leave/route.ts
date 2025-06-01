// 현재 로그인한 사용자의 인증 정보를 가져오기 위한 모듈
import { auth } from '@/lib/auth';
// MongoDB 클라이언트 연결
import clientPromise from '@/lib/mongodb';

// 회원 탈퇴 API (Soft Delete 방식)
export async function DELETE() {
  // 현재 로그인한 사용자 세션 정보를 가져온다.
  const session = await auth();

  // 사용자가 로그인하지 않은 경우 (세션 없음), 401 Unauthorized 응답
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 });
  }

  // MongoDB 클라이언트 연결
  const client = await clientPromise;
  const db = client.db();

  // 로그인된 사용자 이메일을 기준으로 users 컬렉션에서 해당 사용자 문서를 찾아 업데이트
  await db.collection('users').updateOne(
    { email: session.user.email }, // 조건: 로그인된 사용자의 이메일과 일치하는 문서
    {
      $set: {
        isDeleted: true, // Soft delete 표시 (관리자가 필터링 가능)
        deletedAt: new Date(), // 탈퇴 시각 기록 (30일 보관 또는 복구 등 가능성 고려)
        name: '(탈퇴한 회원)', // 사용자 이름을 익명화 (주문 목록 등에서 실명 노출 방지)
        phone: '', // 개인정보 제거
        address: '', // 주소 제거
        postalCode: '', // 우편번호 제거
      },
    }
  );

  // 성공적으로 탈퇴 처리되었음을 응답
  return new Response('회원 탈퇴가 처리되었습니다.', { status: 200 });
}
