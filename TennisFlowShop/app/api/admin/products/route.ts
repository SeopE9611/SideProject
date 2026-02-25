import { NextRequest, NextResponse } from 'next/server';
import { Filter, Sort, Document } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import type {
  AdminProductsListRequestDto,
  AdminProductsListResponseDto,
  AdminProductCreateRequestDto,
  AdminProductListItemDto,
  ProductListStatus,
} from '@/types/admin/products';

type ProductDoc = Record<string, unknown>;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const intValue = Math.trunc(n);
  if (intValue <= 0) return fallback;
  return Math.min(intValue, max);
}

function parseStatus(value: string | null): ProductListStatus {
  if (value === 'active' || value === 'low_stock' || value === 'out_of_stock') return value;
  return 'all';
}

function parseSort(value: string | null): Pick<AdminProductsListRequestDto, 'sortField' | 'sortDirection'> {
  const allowMap: Record<string, AdminProductsListRequestDto['sortField']> = {
    name: 'name',
    brand: 'brand',
    gauge: 'gauge',
    material: 'material',
    price: 'price',
    stock: 'stock',
    createdAt: 'createdAt',
  };

  const sortParam = (value ?? '').trim();
  if (!sortParam) return { sortField: null, sortDirection: 'desc' };

  const [field, dirRaw] = sortParam.split(':');
  const sortField = allowMap[field] ?? null;
  if (!sortField) return { sortField: null, sortDirection: 'desc' };

  return {
    sortField,
    sortDirection: dirRaw === 'asc' ? 'asc' : 'desc',
  };
}

function parseListRequest(url: URL): AdminProductsListRequestDto {
  const sort = parseSort(url.searchParams.get('sort'));
  return {
    page: parsePositiveInt(url.searchParams.get('page'), DEFAULT_PAGE, 100_000),
    pageSize: parsePositiveInt(url.searchParams.get('pageSize'), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
    q: (url.searchParams.get('q') ?? '').trim(),
    brand: url.searchParams.get('brand') ?? 'all',
    material: url.searchParams.get('material') ?? 'all',
    status: parseStatus(url.searchParams.get('status')),
    sortField: sort.sortField,
    sortDirection: sort.sortDirection,
  };
}

function parseCreateRequest(raw: unknown): AdminProductCreateRequestDto | null {
  const body = asRecord(raw);
  if (!body) return null;

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const price = Number(body.price);

  if (!name || !Number.isFinite(price)) return null;
  return { name, price, raw: body };
}

function toProductListItem(doc: ProductDoc): AdminProductListItemDto {
  const inventory = asRecord(doc.inventory);
  const stock = typeof inventory?.stock === 'number' ? inventory.stock : 0;
  const lowStock = typeof inventory?.lowStock === 'number' ? inventory.lowStock : null;

  let computedStatus: AdminProductListItemDto['computedStatus'] = 'active';
  if (stock === 0) computedStatus = 'out_of_stock';
  else if (lowStock !== null && stock > 0 && stock <= lowStock) computedStatus = 'low_stock';

  return {
    ...doc,
    computedStatus,
  };
}

function buildFilter(dto: AdminProductsListRequestDto): Filter<Document> {
  const filter: Filter<Document> = { isDeleted: { $ne: true } };

  if (dto.q) {
    const regex = new RegExp(dto.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { sku: regex }, { brand: regex }, { material: regex }];
  }

  if (dto.brand !== 'all') filter.brand = dto.brand;
  if (dto.material !== 'all') filter.material = dto.material;

  if (dto.status === 'out_of_stock') {
    filter['inventory.stock'] = 0;
  }

  if (dto.status === 'low_stock') {
    const andFilters = Array.isArray(filter.$and) ? filter.$and : [];
    filter.$and = [
      ...andFilters,
      { 'inventory.stock': { $gt: 0 } },
      { 'inventory.lowStock': { $ne: null } },
      { $expr: { $lte: ['$inventory.stock', '$inventory.lowStock'] } },
    ];
  }

  if (dto.status === 'active') {
    const andFilters = Array.isArray(filter.$and) ? filter.$and : [];
    filter.$and = [
      ...andFilters,
      { 'inventory.stock': { $gt: 0 } },
      {
        $or: [{ 'inventory.lowStock': { $exists: false } }, { 'inventory.lowStock': null }, { $expr: { $gt: ['$inventory.stock', '$inventory.lowStock'] } }],
      },
    ];
  }

  return filter;
}

function buildSort(dto: AdminProductsListRequestDto): Sort {
  const fieldMap: Record<NonNullable<AdminProductsListRequestDto['sortField']>, string> = {
    name: 'name',
    brand: 'brand',
    gauge: 'gauge',
    material: 'material',
    price: 'price',
    stock: 'inventory.stock',
    createdAt: 'createdAt',
  };

  if (!dto.sortField) return { createdAt: -1, _id: -1 };

  const dir = dto.sortDirection === 'asc' ? 1 : -1;
  return {
    [fieldMap[dto.sortField]]: dir,
    createdAt: -1,
    _id: -1,
  };
}

export async function GET(req: Request) {
  try {
    const guard = await requireAdmin(req);
    if (!guard.ok) return guard.res;

    const requestDto = parseListRequest(new URL(req.url));

    const db = await getDb();
    const products = db.collection('products');

    const filter = buildFilter(requestDto);
    const sortDoc = buildSort(requestDto);
    const total = await products.countDocuments(filter);

    const skip = (requestDto.page - 1) * requestDto.pageSize;
    const rawItems = await products
      .find(filter, { projection: { isDeleted: 0 } })
      .sort(sortDoc)
      .skip(skip)
      .limit(requestDto.pageSize)
      .toArray();

    const items: AdminProductListItemDto[] = rawItems.map((doc) => toProductListItem(doc as ProductDoc));

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

    const totalsByStatus: AdminProductsListResponseDto['totalsByStatus'] = {
      active: 0,
      low_stock: 0,
      out_of_stock: 0,
    };

    for (const row of totalsAgg) {
      if (typeof row?._id === 'string' && row._id in totalsByStatus && typeof row.count === 'number') {
        totalsByStatus[row._id as keyof typeof totalsByStatus] = row.count;
      }
    }

    const responseDto: AdminProductsListResponseDto = {
      items,
      total,
      page: requestDto.page,
      pageSize: requestDto.pageSize,
      totalsByStatus,
    };

    return NextResponse.json(responseDto);
  } catch (err) {
    console.error('[/api/admin/products] GET error', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  try {
    let rawBody: unknown = null;
    try {
      rawBody = await req.json();
    } catch (e) {
      console.error('[admin/products] invalid json', e);
      return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
    }

    const requestDto = parseCreateRequest(rawBody);
    if (!requestDto) {
      return NextResponse.json({ message: '상품명과 가격은 필수입니다.' }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection('products').insertOne({ ...requestDto.raw, name: requestDto.name, price: requestDto.price });

    return NextResponse.json({ message: '상품 등록 완료', id: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    console.error('[admin/products] create error', error);
    return NextResponse.json({ message: '서버 오류 발생' }, { status: 500 });
  }
}
