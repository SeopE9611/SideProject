import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import { getHangulInitials } from '@/lib/hangul-utils';

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

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const params = url.searchParams;

    // preview=1일 경우: 실시간 미리보기용 검색 (초성 포함)
    if (params.get('preview') === '1') {
      const query = params.get('query')?.trim() || '';
      const client = await clientPromise;
      const db = client.db();
      // isDeleted 플래그가 true인 문서는 제외
      const products = await db
        .collection('products')
        .find({ isDeleted: { $ne: true } })
        .toArray();

      const initialsQuery = getHangulInitials(query);
      const isChosungOnly = /^[ㄱ-ㅎ]+$/.test(query); // 초성만 입력된 경우

      const filtered = products.filter((product: any) => {
        const name = product.name ?? '';
        const nameInitials = getHangulInitials(name);

        if (isChosungOnly) {
          // 초성 검색일 경우
          return nameInitials.includes(initialsQuery);
        } else {
          // 일반 문자열 검색일 경우
          return name.includes(query);
        }
      });
      return NextResponse.json(
        filtered.slice(0, 10).map((product: any) => ({
          _id: product._id.toString(),
          name: product.name,
          price: product.price,
          image: product.images?.[0] ?? null,
        }))
      );
    }

    // 필터/페이징 상품 리스트 반환
    // 필터 파싱
    const brand = params.get('brand');
    const power = params.get('power');
    const control = params.get('control');
    const spin = params.get('spin');
    const durability = params.get('durability');
    const comfort = params.get('comfort');
    const q = params.get('q') || '';
    const sort = params.get('sort') || 'latest';

    // 페이징
    const page = Math.max(1, Number(params.get('page') || '1'));
    const limit = Math.min(100, Number(params.get('limit') || '20'));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { isDeleted: { $ne: true } }; // Soft-Delete된 상품은 기본적으로 제외
    if (brand) filter.brand = brand;
    if (power) filter['features.power'] = { $gte: Number(power) };
    if (control) filter['features.control'] = { $gte: Number(control) };
    if (spin) filter['features.spin'] = { $gte: Number(spin) };
    if (durability) filter['features.durability'] = { $gte: Number(durability) };
    if (comfort) filter['features.comfort'] = { $gte: Number(comfort) };
    if (q) filter.name = { $regex: q, $options: 'i' };

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection('products');

    let sortObj: { [key: string]: 1 | -1 } = { _id: -1 };

    if (sort === 'price-low') sortObj = { price: 1 };
    else if (sort === 'price-high') sortObj = { price: -1 };

    const [total, itemsRaw] = await Promise.all([
      collection.countDocuments(filter),
      // 삭제된 건은 반영되지 않고 페이징
      collection.find(filter).sort(sortObj).skip(skip).limit(limit).toArray(),
    ]);

    const items = itemsRaw.map((product: any) => ({
      ...product,
      _id: product._id.toString(),
    }));

    const hasMore = skip + items.length < total;

    return NextResponse.json({
      products: items,
      pagination: { page, limit, total, hasMore },
    });
  } catch (err) {
    console.error('[상품 리스트 조회 오류]', err);
    return NextResponse.json({ message: '서버 오류' }, { status: 500 });
  }
}
