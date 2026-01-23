import { NextResponse } from 'next/server';
import type { Filter, SortDirection } from 'mongodb';
import { requireAdmin } from '@/lib/admin.guard';

// 숫자 쿼리 파싱 NaN 방지 + 범위 보정 (skip/limit 런타임 에러 예방)
function parseIntParam(v: string | null, opts: { defaultValue: number; min: number; max: number }) {
  const n = Number(v);
  const base = Number.isFinite(n) ? n : opts.defaultValue;
  return Math.min(opts.max, Math.max(opts.min, Math.trunc(base)));
}

export async function GET(req: Request) {
  // --- 관리자 인증 (공용 가드) ---
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const { db } = guard;

  // --- 쿼리 ---
  const url = new URL(req.url);
  const page = parseIntParam(url.searchParams.get('page'), { defaultValue: 1, min: 1, max: 10_000 });
  const limit = parseIntParam(url.searchParams.get('limit'), { defaultValue: 10, min: 1, max: 50 });
  const q = (url.searchParams.get('q') || '').trim();
  const role = url.searchParams.get('role'); // 'user' | 'admin'
  const status = url.searchParams.get('status') || 'all'; // 'all' | 'active' | 'deleted' | 'suspended'
  const sortKey = url.searchParams.get('sort') || 'created_desc'; // 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc'
  const signup = (url.searchParams.get('signup') || 'all') as 'all' | 'local' | 'kakao' | 'naver';

  await db
    .collection('users')
    .createIndex({ lastLoginAt: -1 }, { name: 'users_lastLoginAt_idx' })
    .catch(() => {});
  const col = db.collection('users');

  const login = (url.searchParams.get('login') || 'all') as 'all' | 'nologin' | 'recent30' | 'recent90';

  // --- 필터 ---
  const and: Filter<any>[] = [];

  // 검색어(q): 이름/이메일/휴대폰 부분 일치
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    and.push({ $or: [{ name: regex }, { email: regex }, { phone: regex }] });
  }

  // 역할 필터
  if (role === 'user' || role === 'admin') {
    and.push({ role });
  }

  // 상태 필터
  if (status === 'active') {
    and.push({ isDeleted: { $ne: true } });
    and.push({ isSuspended: { $ne: true } });
  }
  if (status === 'deleted') and.push({ isDeleted: true });
  if (status === 'suspended') and.push({ isSuspended: true });

  // 로그인 필터
  if (login === 'nologin') {
    // lastLoginAt 기록이 없거나(null)인 사용자만
    and.push({ $or: [{ lastLoginAt: { $exists: false } }, { lastLoginAt: null }] });
  } else if (login === 'recent30' || login === 'recent90') {
    // 최근 N일 이내 로그인
    const days = login === 'recent30' ? 30 : 90;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    and.push({ lastLoginAt: { $gte: cutoff } });
  }

  // oauth 가 하나라도 있는 유저 (sns 계정 가입자) 필터
  // 가입유형 필터: local / kakao / naver
  if (signup === 'kakao') {
    and.push({ 'oauth.kakao.id': { $exists: true, $ne: null } });
  }

  if (signup === 'naver') {
    and.push({ 'oauth.naver.id': { $exists: true, $ne: null } });
  }

  if (signup === 'local') {
    // "둘 다 없음" = 일반 가입자
    and.push({
      $and: [{ $or: [{ 'oauth.kakao.id': { $exists: false } }, { 'oauth.kakao.id': null }] }, { $or: [{ 'oauth.naver.id': { $exists: false } }, { 'oauth.naver.id': null }] }],
    });
  }

  // 최종 필터
  const filter: Filter<any> = and.length ? { $and: and } : {};

  // --- 정렬 ---
  type SortDoc = Record<string, SortDirection>;
  let sort: SortDoc;
  switch (sortKey) {
    case 'created_asc':
      sort = { createdAt: 1, name: 1 };
      break;
    case 'name_asc':
      sort = { name: 1, createdAt: -1 };
      break;
    case 'name_desc':
      sort = { name: -1, createdAt: -1 };
      break;
    case 'created_desc':
    default:
      sort = { createdAt: -1, name: 1 };
      break;
  }

  // --- 조회 ---
  const cursor = col
    .find(filter, {
      projection: {
        _id: 1,
        name: 1,
        email: 1,
        phone: 1,
        address: 1,
        addressDetail: 1,
        postalCode: 1,
        pointsBalance: 1,
        role: 1,
        isDeleted: 1,
        isSuspended: 1,
        createdAt: 1,
        updatedAt: 1,
        lastLoginAt: 1,
        'oauth.kakao.id': 1,
        'oauth.naver.id': 1,
      },
    })
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);

  const [items, total] = await Promise.all([cursor.toArray(), col.countDocuments(filter)]);

  // 전체 지표(필터 무시) 동시 계산
  const [grandTotal, activeTotal, deletedTotal, adminTotal, suspendedTotal] = await Promise.all([
    col.countDocuments({}),
    col.countDocuments({ isDeleted: { $ne: true }, isSuspended: { $ne: true } }),
    col.countDocuments({ isDeleted: true }),
    col.countDocuments({ role: 'admin' }),
    col.countDocuments({ isDeleted: { $ne: true }, isSuspended: true }),
  ]);

  return NextResponse.json({
    items: items.map((u: any) => {
      const socialProviders: Array<'kakao' | 'naver'> = [];
      if (u?.oauth?.kakao?.id) socialProviders.push('kakao');
      if (u?.oauth?.naver?.id) socialProviders.push('naver');

      return {
        id: u._id.toString(),
        name: u.name ?? '',
        email: u.email ?? '',
        phone: u.phone ?? '',
        address: u.address ?? '',
        addressDetail: u.addressDetail ?? '',
        postalCode: u.postalCode ?? '',
        pointsBalance: typeof u.pointsBalance === 'number' && Number.isFinite(u.pointsBalance) ? u.pointsBalance : 0,
        role: u.role ?? 'user',
        isDeleted: !!u.isDeleted,
        isSuspended: !!u.isSuspended,
        createdAt: u.createdAt ?? null,
        updatedAt: u.updatedAt ?? null,
        lastLoginAt: u.lastLoginAt ?? null,

        socialProviders,
      };
    }),
    total,
    counters: {
      total: grandTotal,
      active: activeTotal,
      deleted: deletedTotal,
      admins: adminTotal,
      suspended: suspendedTotal,
    },
  });
}
