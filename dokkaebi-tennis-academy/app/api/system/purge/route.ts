import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { deleteOldAnonymizedUsers } from '@/lib/deleteOldAnonymizedUsers'; // 배치 삭제 함수

// 영구 삭제 API (관리자 전용)
export async function GET() {
  const session = await auth(); // 로그인된 세션 확인

  // 로그인되어 있지 않거나 관리자 권한이 아니면 접근 금지
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  // 1년 이상 지난 익명 계정 완전 삭제 실행
  const deletedCount = await deleteOldAnonymizedUsers();

  // 삭제된 계정 수를 JSON 형태로 응답
  return NextResponse.json({ deletedCount });
}
