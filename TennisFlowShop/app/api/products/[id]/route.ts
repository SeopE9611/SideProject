import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// 단일 상품 조회

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const { id } = await params;
    const prod = await db.collection('products').findOne({ _id: new ObjectId(id) });
    if (!prod) {
      return NextResponse.json({ message: '상품을 찾을 수 없습니다.' }, { status: 404 });
    }
    return NextResponse.json({
      product: {
        ...prod,
        _id: prod._id.toString(),
      },
    });
  } catch (err) {
    console.error('[단일 상품 조회 오류]', err);
    return NextResponse.json({ message: '서버 오류' }, { status: 500 });
  }
}

// 상품 정보 업데이트
export { PUT, DELETE } from '@/app/api/admin/products/[id]/route';
