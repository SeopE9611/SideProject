import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// POST 요청만 허용
export async function POST(req: Request) {
  // 요청 본문에서 이메일 꺼내기
  const { email } = await req.json();

  // 이메일이 없으면 400 Bad Request
  if (!email) {
    return NextResponse.json({ message: '이메일이 전달되지 않았습니다.' }, { status: 400 });
  }

  // DB 연결
  const client = await clientPromise;
  const db = client.db();

  // 해당 이메일 계정 복구
  const result = await db.collection('users').updateOne(
    { email },
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

  // 결과 반환
  if (result.modifiedCount === 1) {
    return NextResponse.json({ message: '계정 복구 완료' }, { status: 200 });
  } else {
    return NextResponse.json({ message: '계정 복구 실패' }, { status: 500 });
  }
}
