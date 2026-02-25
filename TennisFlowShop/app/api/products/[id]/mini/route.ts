import { racketBrandLabel } from '@/lib/constants';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  }

  const db = await getDb();
  const idObj = new ObjectId(id);
  const idFilter = { _id: idObj };

  const projection = {
    // products
    name: 1,
    title: 1,
    thumbnail: 1,
    images: 1,
    mountingFee: 1,
    price: 1,

    // used_rackets
    brand: 1,
    model: 1,
  };

  // 1) products 먼저
  const prod = await db.collection('products').findOne(idFilter, { projection });

  if (prod) {
    const rawMountingFee = (prod as any).mountingFee;
    const rawPrice = (prod as any).price;

    const mf = Number(rawMountingFee);
    const pr = Number(rawPrice);

    // mountingFee는 "양수"만 유효로 보고, 아니면 0
    const safeMountingFee = Number.isFinite(mf) && mf > 0 ? mf : 0;
    // price는 0도 유효(무료/이상치 방어는 별도 정책). 일단 음수만 방어
    const safePrice = Number.isFinite(pr) && pr >= 0 ? pr : 0;

    return NextResponse.json(
      {
        ok: true,
        kind: 'product' as const,
        href: `/products/${id}`,
        name: prod.name ?? prod.title ?? '상품',
        image: prod.thumbnail || (Array.isArray(prod.images) && prod.images[0]) || null,
        mountingFee: safeMountingFee,
        price: safePrice,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // 2) 없으면 used_rackets도 조회
  const racket = await db.collection('used_rackets').findOne(idFilter, { projection });

  if (racket) {
    const rawPrice = (racket as any).price;
    const pr = Number(rawPrice);
    const safePrice = Number.isFinite(pr) && pr >= 0 ? pr : 0;

    return NextResponse.json(
      {
        ok: true,
        kind: 'racket' as const,
        href: `/rackets/${id}`,
        name: (() => {
          const brand = String((racket as any).brand ?? '').trim();
          const model = String((racket as any).model ?? '').trim();
          const computed = `${racketBrandLabel(brand)} ${model}`.trim();
          return computed || (racket as any).name || (racket as any).title || '라켓';
        })(),
        image: (racket as any).thumbnail || (Array.isArray((racket as any).images) && (racket as any).images[0]) || null,
        mountingFee: 0, // 라켓은 장착비 개념 없음(필요하면 정책에 맞게)
        price: safePrice,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return NextResponse.json({ ok: false, error: 'notFound' }, { status: 404 });
}
