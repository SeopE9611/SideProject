import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import clientPromise from '@/lib/mongodb';

// PATCH 요청만 허용
export async function PATCH() {
  //  현재 로그인된 사용자 세션 가져오기
  const session = await getServerSession(authConfig);

  //  로그인 안 되어 있으면 401 Unauthorized 반환
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  //  DB 연결
  const client = await clientPromise;
  const db = client.db();

  //  현재 로그인된 사용자의 이메일
  const userEmail = session.user.email;

  //  계정 복구 처리: 삭제 플래그 제거 및 탈퇴 관련 필드 제거
  await db.collection('users').updateOne(
    { email: userEmail },
    {
      $unset: {
        deletedAt: '', // 탈퇴 시점 제거
        withdrawalReason: '', // 탈퇴 사유 제거
        withdrawalDetail: '', // 기타 사유 제거
      },
      $set: {
        isDeleted: false, // 삭제 상태 해제
      },
    }
  );

  //  복구 성공 응답
  return NextResponse.json({ message: '계정 복구 완료' }, { status: 200 });
}
