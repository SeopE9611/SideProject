import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

export async function POST(req: NextRequest) {
  //  인증 처리
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) return new NextResponse('Unauthorized', { status: 401 });

  const payload = verifyAccessToken(token);
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ message: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  try {
    const body = await req.json();

    // 유효성 검사 (기초)
    if (!body.name || !body.price) {
      return NextResponse.json({ message: '상품명과 가격은 필수입니다.' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(); // 기본 DB: dokkaebi-tennis
    const result = await db.collection('products').insertOne(body);

    return NextResponse.json(
      {
        message: '상품 등록 완료',
        id: result.insertedId.toString(), // router.push에서 사용할 수 있도록 문자열화
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[상품 등록 오류]', error);
    return NextResponse.json({ message: '서버 오류 발생' }, { status: 500 });
  }
}
