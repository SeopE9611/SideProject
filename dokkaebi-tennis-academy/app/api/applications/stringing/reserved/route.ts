import { NextResponse } from 'next/server'; // Next.js에서 응답을 반환하기 위한 모듈 임포트
import clientPromise from '@/lib/mongodb';

// GET 요청 핸들러 함수
export async function GET(req: Request) {
  // 요청 URL에서 쿼리 파라미터(searchParams)를 추출함
  const { searchParams } = new URL(req.url);

  // 사용자가 요청한 날짜를 가져옴 (예: 2024-06-20)
  const date = searchParams.get('date');

  // 날짜가 없을 경우 400 Bad Request 에러 응답
  if (!date) {
    return NextResponse.json({ error: '날짜가 누락되었습니다.' }, { status: 400 });
  }

  try {
    // MongoDB 클라이언트 연결
    const client = await clientPromise;
    const db = client.db();

    // 'applications' 컬렉션 접근 (스트링 장착 신청서가 저장된 곳)
    const stringing_applications = db.collection('stringing_applications');

    // 해당 날짜(date)에 접수된 신청서 중 preferredTime(희망 시간대) 필드만 조회
    const results = await stringing_applications
      .find({ 'stringDetails.preferredDate': date }) // preferredDate가 같은 문서 필터
      .project({ 'stringDetails.preferredTime': 1, _id: 0 }) // preferredTime만 가져오고 _id는 제외
      .toArray(); // 커서를 배열로 변환

    // preferredTime 필드만 뽑아서 배열로 정리 (null 등 falsy 값은 필터링)
    // const reservedSlots = results.map((doc) => doc.preferredTime).filter(Boolean);
    const reservedSlots = results.map((doc) => doc.stringDetails?.preferredTime).filter(Boolean);

    // 예약된 시간대 목록을 JSON으로 응답
    return NextResponse.json({ reservedTimes: reservedSlots });
  } catch (err) {
    // 서버 오류가 발생하면 로그를 출력하고 500 Internal Server Error 응답
    console.error('[GET /reserved-slots] Error:', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
