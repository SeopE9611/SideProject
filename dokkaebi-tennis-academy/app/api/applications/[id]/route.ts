import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}


// GET 메서드 정의
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  // 인증 처리
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) return new NextResponse('Unauthorized', { status: 401 });

  const payload = safeVerifyAccessToken(token);
  if (!payload) return new NextResponse('Unauthorized', { status: 401 });

  try {
    const { id } = await context.params;

    // 유효성 검사: 빈 ID일 경우 400 반환
    if (!id) {
      return NextResponse.json({ error: '신청 ID가 제공되지 않았습니다.' }, { status: 400 });
    }

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db();

    // 올바른 컬렉션 이름으로 변경
    const raw = await db
      .collection('stringing_applications') // 'applications' → 'stringing_applications'
      .findOne({
        $or: [
          { _id: new ObjectId(id) }, // MongoDB ObjectId 형태
          { id }, // 혹시 문자열 id로 저장된 경우
        ],
      });

    // 신청서를 찾지 못한 경우
    if (!raw) {
      return NextResponse.json({ error: '해당 신청서를 찾을 수 없습니다.' }, { status: 404 });
    }

    // Application 형태로 매핑
    const application = {
      id: raw._id.toString(),
      type: '스트링 장착 서비스',
      applicantName: raw.name,
      phone: raw.phone,
      appliedAt: raw.createdAt.toISOString(),
      status: raw.status,
      racketType: raw.stringDetails.racketType,
      stringType: raw.stringDetails.stringType,
      preferredDate: raw.stringDetails.preferredDate,
      preferredTime: raw.stringDetails.preferredTime,
      requests: raw.stringDetails.requirements,
      totalPrice: raw.totalPrice ?? 0,
    };

    // 기반환 전에 _id를 string으로 변환 (이제 application.id에 이미 반영됨)
    // const responseData = {
    //   ...application,
    //   _id: application._id.toString(),
    // };

    //  가공된 application 객체를 바로 반환
    return NextResponse.json(application);
  } catch (error) {
    console.error('신청서 조회 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
