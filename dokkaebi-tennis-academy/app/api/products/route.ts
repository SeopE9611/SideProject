import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req: NextRequest) {
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
