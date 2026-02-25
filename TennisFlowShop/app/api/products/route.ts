import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getHangulInitials } from '@/lib/hangul-utils';
import { ObjectId } from 'mongodb';
import type { Filter } from 'mongodb';

type ProductDoc = {
  _id: ObjectId;
  name?: string;
  price?: number;
  images?: string[];
  brand?: string;
  material?: string;
  mountingFee?: number;
  features?: { power?: number; control?: number; spin?: number; durability?: number; comfort?: number };
  inventory?: { isFeatured?: boolean };
  isDeleted?: boolean;
};

export { POST } from '@/app/api/admin/products/route';


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
        .collection<ProductDoc>('products')
        .find({ isDeleted: { $ne: true } })
        .toArray();

      const initialsQuery = getHangulInitials(query);
      const isChosungOnly = /^[ㄱ-ㅎ]+$/.test(query); // 초성만 입력된 경우

      const filtered = products.filter((product) => {
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
        filtered.slice(0, 10).map((product) => ({
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
    const material = params.get('material');
    const minPrice = params.get('minPrice');
    const maxPrice = params.get('maxPrice');
    const purpose = params.get('purpose');
    const isFeatured = params.get('isFeatured'); // 'true' | 'false'
    const exclude = params.get('exclude'); // string(ObjectId)

    // 페이징
    const page = Math.max(1, Number(params.get('page') || '1'));
    const limit = Math.min(100, Number(params.get('limit') || '20'));
    const skip = (page - 1) * limit;

    const filter: Filter<ProductDoc> = { isDeleted: { $ne: true } }; // Soft-Delete된 상품은 기본적으로 제외
    if (brand) filter.brand = brand;
    if (power) filter['features.power'] = { $gte: Number(power) };
    if (control) filter['features.control'] = { $gte: Number(control) };
    if (spin) filter['features.spin'] = { $gte: Number(spin) };
    if (durability) filter['features.durability'] = { $gte: Number(durability) };
    if (comfort) filter['features.comfort'] = { $gte: Number(comfort) };
    if (q) filter.name = { $regex: q, $options: 'i' };
    if (material) filter.material = material;
    if (isFeatured === 'true') filter['inventory.isFeatured'] = true;

    // 가격 범위 필터(기존 훅(useInfiniteProducts)에서 이미 사용중인 파라미터를 서버에서 반영)
    if (minPrice || maxPrice) {
      const priceFilter: { $gte?: number; $lte?: number } = {};
      if (minPrice !== null && minPrice !== undefined && minPrice !== '') {
        const min = Number(minPrice);
        if (Number.isFinite(min)) priceFilter.$gte = min;
      }
      if (maxPrice !== null && maxPrice !== undefined && maxPrice !== '') {
        const max = Number(maxPrice);
        if (Number.isFinite(max)) priceFilter.$lte = max;
      }
      if (Object.keys(priceFilter).length > 0) filter.price = priceFilter;
    }

    // purpose 필터: 특정 "용도"에 맞는 상품만 노출
    // - stringing: 교체 서비스에 쓰는 스트링 상품(=mountingFee가 있는 상품)만 보여준다.
    if (purpose === 'stringing') {
      filter.mountingFee = { $gt: 0 };
    }
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection<ProductDoc>('products');

    let sortObj: { [key: string]: 1 | -1 } = { _id: -1 };

    if (sort === 'price-low') sortObj = { price: 1 };
    else if (sort === 'price-high') sortObj = { price: -1 };

    const idFilter = exclude && ObjectId.isValid(exclude) ? { _id: { $ne: new ObjectId(exclude) } } : {};
    const composed = { ...filter, ...idFilter };

    const [total, itemsRaw] = await Promise.all([collection.countDocuments(composed), collection.find(composed).sort(sortObj).skip(skip).limit(limit).toArray()]);

    const items = itemsRaw.map((product) => ({
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
