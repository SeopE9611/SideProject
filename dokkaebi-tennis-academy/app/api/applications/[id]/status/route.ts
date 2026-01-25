import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// 허용된 상태 값 목록 (관리자가 선택 가능)
import { APPLICATION_STATUSES } from '@/lib/application-status';

// PATCH 요청 핸들러: 신청서 상태를 변경함
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth(); // 현재 로그인한 사용자 인증

  // 관리자만 접근 가능
  if (!session || session.user.role !== 'admin') {
    return new NextResponse('Unauthorized', { status: 401 }); // 인증 실패 시 401 반환
  }

  const { id } = await params;

  // ObjectId 형식 확인 (잘못된 형식이면 에러 처리)
  if (!ObjectId.isValid(id)) {
    return new NextResponse('Invalid ID', { status: 400 });
  }

  // 요청 본문에서 상태값 추출
  let body: any = null;
  try {
    body = await req.json();
  } catch (e) {
    console.error('[applications/status] invalid json', e);
    return NextResponse.json({ message: 'INVALID_JSON' }, { status: 400 });
  }

  const status = body?.status;
  if (typeof status !== 'string') {
    return NextResponse.json({ message: 'INVALID_STATUS' }, { status: 400 });
  }

  // 허용되지 않은 상태값이면 에러 처리
  if (!APPLICATION_STATUSES.includes(status)) {
    return new NextResponse('Invalid status value', { status: 400 });
  }

  try {
    // DB 연결 및 컬렉션 접근
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection('stringing_applications');

    // 해당 ID의 신청서 상태 업데이트
    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: { status } });

    // 신청서가 존재하지 않을 경우
    if (result.matchedCount === 0) {
      return new NextResponse('Application not found', { status: 404 });
    }

    // 성공 응답 반환
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[STATUS_PATCH_ERROR]', error); // 디버깅 로그
    return new NextResponse('Internal Server Error', { status: 500 }); // 서버 오류
  }
}
