import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import { getHangulInitials } from '@/lib/hangul-utils';
import { ObjectId } from 'mongodb';

// 단일 상품 조회
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  // 인증 권한 검사
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) return new NextResponse('Unauthorized', { status: 401 });
  const payload = verifyAccessToken(token);
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ message: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  // 본문 파싱 및 업데이트
  try {
    const body = await req.json();
    const client = await clientPromise;
    const db = client.db();

    // 등록 페이지와 동일한 필드 구조
    const updateData: any = {
      name: body.name,
      sku: body.sku,
      shortDescription: body.shortDescription,
      description: body.description,
      brand: body.brand,
      material: body.material,
      gauge: body.gauge,
      color: body.color,
      length: body.length,
      mountingFee: body.mountingFee,
      price: body.price,
      features: body.features,
      tags: body.tags,
      specifications: body.specifications,
      additionalFeatures: body.additionalFeatures,
      images: body.images,
      inventory: body.inventory,

      // 검색용 이니셜
      searchInitials: getHangulInitials(body.name),
      brandInitials: getHangulInitials(body.brand),
    };
    const { id } = await params;
    const result = await db.collection('products').updateOne({ _id: new ObjectId(id) }, { $set: updateData });
    if (result.matchedCount === 0) {
      return NextResponse.json({ message: '상품 업데이트 실패' }, { status: 500 });
    }
    return NextResponse.json({ message: '상품이 성공적으로 업데이트되었습니다.' });
  } catch (err) {
    console.error('[상품 수정 오류]', err);
    return NextResponse.json({ message: '서버 오류' }, { status: 500 });
  }
}
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  // 인증 권한 검사
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) return new NextResponse('Unauthorized', { status: 401 });
  const payload = verifyAccessToken(token);
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ message: '관리자 권한이 필요합니다.' }, { status: 403 });
  }
  const { id } = await params;

  try {
    const client = await clientPromise;
    const db = client.db();
    // soft-delete: isDeleted 플래그만 true로 설정
    const result = await db.collection('products').updateOne({ _id: new ObjectId(id) }, { $set: { isDeleted: true, deletedAt: new Date() } });

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: '상품을 찾을 수 없습니다.' }, { status: 404 });
    }
    return NextResponse.json({ message: '상품이 삭제되었습니다.' }, { status: 200 });
  } catch (err) {
    console.error('[상품 삭제 오류]', err);
    return NextResponse.json({ message: '서버 오류' }, { status: 500 });
  }
}
