import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { authConfig } from '@/lib/auth.config';

export async function PATCH(req: Request) {
  // 요청 본문에서 탈퇴 사유(reason)와 세부 사유(detail)를 추출
  const { reason, detail } = await req.json();

  // 현재 로그인된 사용자 세션 가져오기
  const session = await getServerSession(authConfig);

  if (!session?.user?.email) {
    // 로그인 상태가 아니면 401 반환
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    //  탈퇴 정보를 DB에 업데이트
    await db.collection('users').updateOne(
      { email: session.user.email },
      {
        $set: {
          isDeleted: true, // soft delete 처리
          deletedAt: new Date(), // 탈퇴 시간 기록
          withdrawalReason: reason || null, // 선택한 사유
          withdrawalDetail: detail || null, // 기타 입력 내용
        },
      }
    );

    // 성공 응답
    return NextResponse.json({ message: '탈퇴 완료', email: session.user.email }, { status: 200 });
  } catch (error) {
    console.error(' 탈퇴 처리 중 오류:', error);
    return NextResponse.json({ message: '서버 오류 발생' }, { status: 500 });
  }
}
