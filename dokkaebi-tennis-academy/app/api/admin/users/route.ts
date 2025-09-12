import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { Filter, Sort, SortDirection } from 'mongodb';

export async function GET(req: Request) {
  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload?.sub || payload.role !== 'admin') {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || '10')));
  const q = (url.searchParams.get('q') || '').trim();
  const role = url.searchParams.get('role'); // "user" | "admin" | null
  const status = url.searchParams.get('status') || 'all'; // "all" | "active" | "deleted"
  const sortKey = url.searchParams.get('sort') || 'created_desc';

  const db = await getDb();
  const col = db.collection('users');

  // ---- 필터 구성 ----
  const filter: Filter<any> = {};
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }
  if (role === 'user' || role === 'admin') {
    filter.role = role;
  }
  if (status === 'active') filter.isDeleted = { $ne: true };
  if (status === 'deleted') filter.isDeleted = true;

  // ---- 정렬 구성 ----
  type SortDoc = Record<string, SortDirection>;
  let sort: SortDoc;
  switch (sortKey) {
    case 'created_asc':
      sort = { createdAt: 1 };
      break;
    case 'name_asc':
      sort = { name: 1, createdAt: -1 };
      break;
    case 'name_desc':
      sort = { name: -1, createdAt: -1 };
      break;
    case 'created_desc':
    default:
      sort = { createdAt: -1 };
      break;
  }

  // ---- 조회 ----
  const cursor = col
    .find(filter, {
      projection: {
        _id: 1,
        name: 1,
        email: 1,
        phone: 1,
        role: 1,
        isDeleted: 1,
        createdAt: 1,
        updatedAt: 1,
        lastLoginAt: 1, // 로그인 시 업데이트할 여지가 있음(현재는 없을 수 있음)
      },
    })
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);

  const [items, total] = await Promise.all([cursor.toArray(), col.countDocuments(filter)]);

  // id 문자열화
  const shaped = items.map((u: any) => ({
    id: u._id.toString(),
    name: u.name ?? '',
    email: u.email ?? '',
    phone: u.phone ?? '',
    role: u.role ?? 'user',
    isDeleted: !!u.isDeleted,
    createdAt: u.createdAt ?? null,
    updatedAt: u.updatedAt ?? null,
    lastLoginAt: u.lastLoginAt ?? null,
  }));

  return NextResponse.json({ items: shaped, total });
}
