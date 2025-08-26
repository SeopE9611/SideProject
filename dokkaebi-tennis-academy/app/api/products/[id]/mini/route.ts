import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  }

  const db = await getDb();
  const prod = await db.collection('products').findOne({ _id: new ObjectId(id) }, { projection: { name: 1, title: 1, thumbnail: 1, images: 1 } });
  if (!prod) return NextResponse.json({ ok: false, error: 'notFound' }, { status: 404 });

  return NextResponse.json(
    {
      ok: true,
      name: prod.name ?? prod.title ?? '상품',
      image: prod.thumbnail || (Array.isArray(prod.images) && prod.images[0]) || null,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
