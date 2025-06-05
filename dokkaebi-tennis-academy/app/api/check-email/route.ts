import clientPromise from '@/lib/mongodb';

// GET 요청 처리
export async function GET(req: Request) {
  //  URL에서 email 파라미터 추출
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  // email이 비어있으면 400 응답
  if (!email) {
    return new Response(JSON.stringify({ error: '이메일을 입력해주세요.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // MongoDB 클라이언트 연결
  const client = await clientPromise;
  const db = client.db();

  // users 컬렉션에서 해당 이메일이 이미 존재하는지 확인
  const existingUser = await db.collection('users').findOne({ email });

  // 존재 여부에 따라 결과 반환
  return new Response(
    JSON.stringify({ isAvailable: !existingUser }), // true면 사용 가능, false면 이미 존재
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
