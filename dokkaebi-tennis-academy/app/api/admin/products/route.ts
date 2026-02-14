import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin.guard';

export async function GET(req: Request) {
  try {
    const guard = await requireAdmin(req);
    if (!guard.ok) return guard.res;


    const { searchParams } = new URL(req.url);

    // 페이지네이션/필터 파라미터
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const pageSizeParam = parseInt(searchParams.get('pageSize') || '10', 10);
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const pageSize = Number.isFinite(pageSizeParam) && pageSizeParam > 0 && pageSizeParam <= 100 ? pageSizeParam : 10;

    const q = (searchParams.get('q') || '').trim();
    const brand = searchParams.get('brand') || 'all';
    const material = searchParams.get('material') || 'all';
    const status = (searchParams.get('status') || 'all') as 'all' | 'active' | 'low_stock' | 'out_of_stock';

    // 정렬 파라미터 파싱 ex) ?sort=price:asc
    const sortParam = (searchParams.get('sort') || '').trim();
    const allowMap: Record<string, string> = {
      name: 'name',
      brand: 'brand',
      gauge: 'gauge',
      material: 'material',
      price: 'price',
      stock: 'inventory.stock',
      createdAt: 'createdAt',
    };
    let sortDoc: Record<string, 1 | -1> = {};
    if (sortParam) {
      const [field, dirRaw] = sortParam.split(':');
      const key = allowMap[field];
      if (key) {
        const dir = dirRaw === 'asc' ? 1 : -1;
        sortDoc[key] = dir;
        // 안정 정렬(동일값일 때 최신 우선)
        if (!('createdAt' in sortDoc)) sortDoc.createdAt = -1;
        sortDoc._id = -1;
      }
    }
    if (Object.keys(sortDoc).length === 0) {
      // 기본 정렬(기존과 동일)
      sortDoc = { createdAt: -1, _id: -1 };
    }

    const db = await getDb();
    const products = db.collection('products');

    // 리스트용 필터
    const filter: any = { isDeleted: { $ne: true } };

    if (q) {
      // 정규식
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { sku: regex }, { brand: regex }, { material: regex }];
    }

    if (brand !== 'all') filter.brand = brand;
    if (material !== 'all') filter.material = material;

    if (status !== 'all') {
      if (status === 'out_of_stock') {
        filter['inventory.stock'] = 0;
      } else if (status === 'low_stock') {
        filter.$and = [...(filter.$and || []), { 'inventory.stock': { $gt: 0 } }, { 'inventory.lowStock': { $ne: null } }, { $expr: { $lte: ['$inventory.stock', '$inventory.lowStock'] } }];
      } else if (status === 'active') {
        filter.$and = [
          ...(filter.$and || []),
          { 'inventory.stock': { $gt: 0 } },
          {
            $or: [{ 'inventory.lowStock': { $exists: false } }, { 'inventory.lowStock': null }, { $expr: { $gt: ['$inventory.stock', '$inventory.lowStock'] } }],
          },
        ];
      }
    }

    // 총 개수(필터 적용)
    const total = await products.countDocuments(filter);

    // 페이지 아이템(필터 적용 + 정렬 적용)
    const skip = (page - 1) * pageSize;
    const rawItems = await products
      .find(filter, { projection: { isDeleted: 0 } })
      .sort(sortDoc)
      .skip(skip)
      .limit(pageSize)
      .toArray();

    // 각 아이템 computedStatus 계산
    const items = rawItems.map((doc: any) => {
      const stock = doc?.inventory?.stock ?? 0;
      const lowStock = doc?.inventory?.lowStock;
      let computedStatus: 'active' | 'low_stock' | 'out_of_stock' = 'active';
      if (stock === 0) computedStatus = 'out_of_stock';
      else if (typeof lowStock === 'number' && stock > 0 && stock <= lowStock) {
        computedStatus = 'low_stock';
      }
      return { ...doc, computedStatus };
    });

    // 전역 통계(필터 무시)
    const totalsAgg = await products
      .aggregate([
        { $match: { isDeleted: { $ne: true } } },
        {
          $addFields: {
            computedStatus: {
              $switch: {
                branches: [
                  { case: { $eq: ['$inventory.stock', 0] }, then: 'out_of_stock' },
                  {
                    case: {
                      $and: [{ $gt: ['$inventory.stock', 0] }, { $ne: ['$inventory.lowStock', null] }, { $lte: ['$inventory.stock', '$inventory.lowStock'] }],
                    },
                    then: 'low_stock',
                  },
                ],
                default: 'active',
              },
            },
          },
        },
        { $group: { _id: '$computedStatus', count: { $sum: 1 } } },
      ])
      .toArray();

    const totalsByStatus: Record<'active' | 'low_stock' | 'out_of_stock', number> = {
      active: 0,
      low_stock: 0,
      out_of_stock: 0,
    };
    for (const row of totalsAgg) {
      if (row?._id in totalsByStatus) {
        totalsByStatus[row._id as keyof typeof totalsByStatus] = row.count;
      }
    }

    return NextResponse.json({
      items,
      total, // 페이지네이션용: 필터가 적용된 총 개수
      page,
      pageSize,
      totalsByStatus, // 전역 통계(필터 무시)
    });
  } catch (err) {
    console.error('[/api/admin/products] GET error', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
