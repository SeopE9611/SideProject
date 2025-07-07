export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import clientPromise, { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

export async function PATCH(req: Request, context: { params: { id: string } }) {
  // 쿠키에서 accessToken 추출
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) return new NextResponse('Unauthorized', { status: 401 }); // 토큰 없으면 인증 실패

  // accessToken 유효성 검증
  const payload = verifyAccessToken(token);
  if (!payload) return new NextResponse('Unauthorized', { status: 401 }); // 토큰이 변조되었거나 만료됨

  // URL 파라미터로부터 신청 ID 추출
  const { id } = context.params;
  if (!ObjectId.isValid(id)) return new NextResponse('Invalid ID', { status: 400 }); // MongoDB ObjectId 형식 검증

  // 요청 본문에서 status 값 추출
  const { status } = await req.json();
  if (!status || typeof status !== 'string') {
    return NextResponse.json({ error: '상태값 누락 또는 형식 오류' }, { status: 400 });
  }

  // MongoDB 연결
  const client = await clientPromise;
  const db = await getDb();

  // description 따로 준비
  const description = `신청서 상태가 [${status}]로 변경되었습니다.`;

  // historyEntry 객체 구성
  const historyEntry = {
    status,
    date: new Date(),
    description,
  };

  // 상태 + 이력 함께 업데이트
  const result = await db.collection('stringing_applications').updateOne({ _id: new ObjectId(id) }, {
    $set: { status }, // 상태 변경
    $push: {
      history: {
        $each: [historyEntry], // 이력 추가
      },
    },
  } as any);

  // 신청서를 찾지 못했을 경우
  if (result.matchedCount === 0) {
    return NextResponse.json({ error: '신청서를 찾을 수 없습니다.' }, { status: 404 });
  }

  //  정상 처리 시 성공 응답 반환
  return NextResponse.json({ success: true });
}
