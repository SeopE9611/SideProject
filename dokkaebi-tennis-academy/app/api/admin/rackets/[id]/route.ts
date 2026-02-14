import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { normalizeStringPattern, RACKET_BRANDS } from '@/lib/constants';
import { requireAdmin } from '@/lib/admin.guard';

// GET - 단일 조회
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const db = (await clientPromise).db();
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Bad Request' }, { status: 400 });
  }
  const doc = await db.collection('used_rackets').findOne({ _id: new ObjectId(id) });
  if (!doc) return NextResponse.json({ message: 'Not Found' }, { status: 404 });
  return NextResponse.json({ ...doc, id: doc._id.toString(), _id: undefined });
}

// PATCH - 수정
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const db = (await clientPromise).db();
  let body: any = null;
  try {
    body = await req.json();
  } catch (e) {
    console.error('[admin/rackets] invalid json', e);
    return NextResponse.json({ message: 'INVALID_JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ message: 'INVALID_BODY' }, { status: 400 });
  }
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Bad Request' }, { status: 400 });
  }
  const enabled = !!body?.rental?.enabled;
  const disabledReason = String(body?.rental?.disabledReason ?? '').trim();
  if (enabled === false && !disabledReason) {
    return NextResponse.json({ message: '대여 불가 사유가 필요합니다.' }, { status: 400 });
  }

  const numOrNull = (v: any) => (v == null || v === '' ? null : Number(v));

  const set: any = {
    brand: String(body.brand ?? '')
      .trim()
      .toLowerCase(),
    model: String(body.model ?? '').trim(),
    year: Number(body.year ?? 0) || null,
    spec: {
      weight: numOrNull(body.spec?.weight),
      balance: numOrNull(body.spec?.balance),
      headSize: numOrNull(body.spec?.headSize),
      lengthIn: numOrNull(body.spec?.lengthIn),
      swingWeight: numOrNull(body.spec?.swingWeight),
      stiffnessRa: numOrNull(body.spec?.stiffnessRa),
      pattern: normalizeStringPattern(body.spec?.pattern ?? ''),
      gripSize: String(body.spec?.gripSize ?? '').trim(),
    },
    condition: body.condition ?? 'B',
    price: Number(body.price ?? 0),
    images: Array.isArray(body.images) ? body.images : [],
    status: body.status ?? 'available',
    searchKeywords: Array.isArray(body.searchKeywords) ? body.searchKeywords.map((k: any) => String(k).trim()).filter((k: string) => k.length > 0) : [],
    rental: {
      enabled,
      deposit: Number(body?.rental?.deposit ?? 0),
      fee: {
        d7: Number(body?.rental?.fee?.d7 ?? 0),
        d15: Number(body?.rental?.fee?.d15 ?? 0),
        d30: Number(body?.rental?.fee?.d30 ?? 0),
      },
      disabledReason: enabled ? '' : disabledReason,
    },
    quantity: Math.max(1, Number(body.quantity ?? 1)),
    updatedAt: new Date(),
  };

  if (!set.brand || !set.model) {
    return NextResponse.json({ message: '브랜드/모델은 필수입니다.' }, { status: 400 });
  }

  const brandOk = RACKET_BRANDS.some((b) => b.value === set.brand);
  if (!brandOk) {
    return NextResponse.json({ message: '브랜드 값이 유효하지 않습니다.' }, { status: 400 });
  }

  for (const k of ['weight', 'balance', 'headSize', 'lengthIn', 'swingWeight', 'stiffnessRa'] as const) {
    const v = set.spec?.[k];
    if (v !== null && v !== undefined && !Number.isFinite(v)) {
      return NextResponse.json({ message: `spec.${k} 값이 유효하지 않습니다.` }, { status: 400 });
    }
  }

  const res = await db.collection('used_rackets').updateOne({ _id: new ObjectId(id) }, { $set: set });
  if (!res.matchedCount) return NextResponse.json({ message: 'Not Found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// DELETE 삭제
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const db = (await clientPromise).db();
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Bad Request' }, { status: 400 });
  }
  const res = await db.collection('used_rackets').deleteOne({ _id: new ObjectId(id) });
  if (!res.deletedCount) return NextResponse.json({ message: 'Not Found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
