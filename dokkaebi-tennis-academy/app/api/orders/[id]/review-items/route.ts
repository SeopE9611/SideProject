import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { racketBrandLabel } from '@/lib/constants';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const orderId = id;

  // 인증
  const token = (await cookies()).get('accessToken')?.value;
  if (!token) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  // accessToken이 깨져 verifyAccessToken이 throw 되어도 500이 아니라 401로 정리
  let payload: any = null;
  try {
    payload = verifyAccessToken(token);
  } catch {
    payload = null;
  }
  const userIdStr = typeof payload?.sub === 'string' ? payload.sub : '';
  if (!userIdStr || !ObjectId.isValid(userIdStr)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  // 파라미터 검증
  if (!ObjectId.isValid(orderId)) {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  }

  const db = await getDb();
  const userId = new ObjectId(userIdStr);
  const orderIdObj = new ObjectId(orderId);

  // 내 주문인지 확인 + 주문 항목 확보
  const order = await db.collection('orders').findOne({ _id: orderIdObj, userId });
  if (!order) {
    return NextResponse.json({ ok: false, error: 'orderNotFound' }, { status: 404 });
  }

  const items: any[] = Array.isArray(order.items) ? order.items : [];

  // 주문 스냅샷에 레거시 productId(비 ObjectId) 값이 섞여 있을 수 있으므로 ObjectId 유효성으로 1차 필터
  // - 유효하지 않은 productId가 있더라도 이 API가 500으로 터지면 안 됨
  const productIds = Array.from(new Set(items.map((it) => (it?.productId ? String(it.productId) : null)).filter((v): v is string => !!v && ObjectId.isValid(v))));

  // 이미 작성된 상품 조회
  const reviewed = productIds.length
    ? await db
        .collection('reviews')
        .find({
          userId,
          orderId: orderIdObj,
          productId: { $in: productIds.map((pid) => new ObjectId(pid)) },
          isDeleted: { $ne: true },
        })
        .project({ productId: 1 })
        .toArray()
    : [];

  const reviewedSet = new Set(reviewed.map((r) => String(r.productId)));

  // 제품 메타 (주문 스냅샷 우선, 없으면 products 컬렉션에서 보강)
  const missingMetaIds = new Set<string>();
  const metaFromOrder = new Map<string, { name?: string; image?: string }>();

  for (const it of items) {
    const pid = it?.productId ? String(it.productId) : null;
     if (!pid || !ObjectId.isValid(pid)) continue;

    const name = it.name || it.productName || it.title; // 주문 스냅샷 이름
    const image = it.image || it.thumbnail || it.thumbnailUrl || (Array.isArray(it.images) && it.images.length ? it.images[0] : undefined); // 주문 스냅샷 이미지

    // 스냅샷 값은 일단 저장
    if (name || image) metaFromOrder.set(pid, { name, image });

    // name이나 image 둘 중 하나라도 비어있으면 products에서 백필 대상으로 등록
    if (!name || !image) missingMetaIds.add(pid);
  }

  // 부족한 메타는 products에서 채움 (스냅샷 값 우선, 없으면 products 값)
  if (missingMetaIds.size) {
    const prods = await db
      .collection('products')
      .find({ _id: { $in: Array.from(missingMetaIds).map((id) => new ObjectId(id)) } })
      .project({ name: 1, title: 1, thumbnail: 1, images: 1 })
      .toArray();

    for (const p of prods) {
      const pid = String(p._id);
      const prev = metaFromOrder.get(pid) || {};
      metaFromOrder.set(pid, {
        name: prev.name ?? p.name ?? p.title,
        image: prev.image ?? p.thumbnail ?? (Array.isArray(p.images) && p.images[0]) ?? undefined,
      });
    }
  }

  // products에서 못 찾았거나(=제품이 아니라 라켓) 아직 name/image가 부족한 항목은 used_rackets에서도 백필
  const stillMissingIds = Array.from(missingMetaIds).filter((pid) => {
    const m = metaFromOrder.get(pid) || {};
    return !m.name || !m.image;
  });

  if (stillMissingIds.length) {
    const rackets = await db
      .collection('used_rackets')
      .find({ _id: { $in: stillMissingIds.map((rid) => new ObjectId(rid)) } })
      .project({ brand: 1, model: 1, images: 1 })
      .toArray();

    for (const r of rackets) {
      const pid = String(r._id);
      const prev = metaFromOrder.get(pid) || {};

      const brand = typeof (r as any).brand === 'string' ? (r as any).brand : '';
      const model = typeof (r as any).model === 'string' ? (r as any).model : '';
      const computedName = `${racketBrandLabel(brand)} ${model}`.trim() || '라켓';
      const computedImage =
        Array.isArray((r as any).images) && (r as any).images.length ? (r as any).images[0] : undefined;

      metaFromOrder.set(pid, {
        name: prev.name ?? computedName,
        image: prev.image ?? computedImage,
      });
    }
  }

  const list = productIds.map((pid) => {
    const meta = metaFromOrder.get(pid) || {};
    return {
      productId: pid,
      name: meta.name ?? '상품',
      image: meta.image ?? null,
      reviewed: reviewedSet.has(pid),
    };
  });

  const counts = {
    total: list.length,
    reviewed: list.filter((x) => x.reviewed).length,
  };
  const remaining = counts.total - counts.reviewed;
  const next = list.find((x) => !x.reviewed)?.productId || null;

  return NextResponse.json({ ok: true, orderId, items: list, counts: { ...counts, remaining }, nextProductId: next }, { headers: { 'Cache-Control': 'no-store' } });
}
