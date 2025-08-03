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

// GET: 필터/정렬/페이징된 상품 리스트를 반환
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const params = url.searchParams;

    // 필터 파싱
    const brand = params.get('brand');
    const power = params.get('power');
    const control = params.get('control');
    const spin = params.get('spin');
    const durability = params.get('durability');
    const comfort = params.get('comfort');
    const q = params.get('q') || '';
    const sort = params.get('sort') || 'latest';

    // 페이징: 기본 page=1, limit=20 (최대 100까지 제한)
    const page = Math.max(1, Number(params.get('page') || '1'));
    const limit = Math.min(100, Number(params.get('limit') || '20'));
    const skip = (page - 1) * limit;

    // Mongo 필터 조합
    const filter: Record<string, any> = {};

    if (brand) filter.brand = brand;
    if (power) filter['features.power'] = { $gte: Number(power) };
    if (control) filter['features.control'] = { $gte: Number(control) };
    if (spin) filter['features.spin'] = { $gte: Number(spin) };
    if (durability) filter['features.durability'] = { $gte: Number(durability) };
    if (comfort) filter['features.comfort'] = { $gte: Number(comfort) };
    if (q) filter.name = { $regex: q, $options: 'i' }; // 대소문자 무시 부분 일치 검색

    const client = await clientPromise;
    const db = client.db(); // 기본 DB: dokkaebi-tennis
    const collection = db.collection('products');

    // 정렬 매핑
    let sortObj: Record<string, number> = { _id: -1 }; // 최신순 기본
    if (sort === 'price-low') sortObj = { price: 1 };
    else if (sort === 'price-high') sortObj = { price: -1 };
    // popular 같은 추가 정렬 기준은 나중에 metric 기반으로 확장 가능

    // 병렬로 총 갯수와 실제 페이지 데이터 가져오기
    const [total, itemsRaw] = await Promise.all([
      collection.countDocuments(filter),
      collection
        .find(filter)
        .sort(sortObj as any)
        .skip(skip)
        .limit(limit)
        .toArray(),
    ]);

    // ObjectId -> string 변환 포함
    const items = itemsRaw.map((product: any) => ({
      ...product,
      _id: product._id.toString(),
    }));

    const hasMore = skip + items.length < total;

    return NextResponse.json({
      products: items,
      pagination: {
        page,
        limit,
        total,
        hasMore,
      },
    });
  } catch (err) {
    console.error('[상품 리스트 조회 오류]', err);
    return NextResponse.json({ message: '서버 오류' }, { status: 500 });
  }
}
