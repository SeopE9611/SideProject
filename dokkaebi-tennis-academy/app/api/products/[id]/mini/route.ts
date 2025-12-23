import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  }

  const db = await getDb();

  const prod = await db.collection('products').findOne(
    { _id: new ObjectId(id) },
    {
      projection: {
        name: 1,
        title: 1,
        thumbnail: 1,
        images: 1,
        mountingFee: 1,
        price: 1,
      },
    }
  );

  if (!prod) return NextResponse.json({ ok: false, error: 'notFound' }, { status: 404 });
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
      name: prod.name ?? prod.title ?? '상품',
      image: prod.thumbnail || (Array.isArray(prod.images) && prod.images[0]) || null,
      mountingFee: safeMountingFee,
      price: safePrice,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
