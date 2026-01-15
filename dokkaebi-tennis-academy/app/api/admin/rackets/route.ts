import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { RACKET_BRANDS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  // const user = await getCurrentUser(); if (!user?.isAdmin) throw new Error('FORBIDDEN');
  return true;
}

export async function GET(req: Request) {
  await requireAdmin();
  const db = (await clientPromise).db();
  const { searchParams } = new URL(req.url);
  const brand = searchParams.get('brand')?.trim();
  const qtext = searchParams.get('q')?.trim();
  const status = searchParams.get('status')?.trim();
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '20')));

  const q: any = {};
  if (brand) q.brand = { $regex: new RegExp(`^${brand}$`, 'i') };
  if (status) q.status = status;
  if (qtext) q.$or = [{ brand: { $regex: qtext, $options: 'i' } }, { model: { $regex: qtext, $options: 'i' } }];

  const cursor = db
    .collection('used_rackets')
    .find(q)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize);

  const [items, total] = await Promise.all([cursor.project({ brand: 1, model: 1, price: 1, condition: 1, status: 1, rental: 1, images: 1, quantity: 1 }).toArray(), db.collection('used_rackets').countDocuments(q)]);

  const mapped = items.map((r: any) => ({ ...r, id: r._id.toString(), _id: undefined }));
  return NextResponse.json({ items: mapped, total, page, pageSize });
}

export async function POST(req: Request) {
  await requireAdmin();
  const db = (await clientPromise).db();
  const body = await req.json();

  // 검증
  const doc = {
    brand: String(body.brand ?? '')
      .trim()
      .toLowerCase(),
    model: String(body.model ?? '').trim(),
    year: Number(body.year ?? 0) || null,
    // 검색 키워드
    searchKeywords: Array.isArray(body.searchKeywords) ? body.searchKeywords.map((k: any) => String(k).trim()).filter((k: string) => k.length > 0) : [],
    spec: {
      weight: body.spec?.weight != null && body.spec?.weight !== '' ? Number(body.spec.weight) : null,
      balance: body.spec?.balance != null && body.spec?.balance !== '' ? Number(body.spec.balance) : null,
      headSize: body.spec?.headSize != null && body.spec?.headSize !== '' ? Number(body.spec.headSize) : null,
      lengthIn: body.spec?.lengthIn != null && body.spec?.lengthIn !== '' ? Number(body.spec.lengthIn) : null,
      swingWeight: body.spec?.swingWeight != null && body.spec?.swingWeight !== '' ? Number(body.spec.swingWeight) : null,
      stiffnessRa: body.spec?.stiffnessRa != null && body.spec?.stiffnessRa !== '' ? Number(body.spec.stiffnessRa) : null,
      pattern: String(body.spec?.pattern ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[×]/g, 'x'),
      gripSize: String(body.spec?.gripSize ?? '').trim(),
    },
    condition: body.condition ?? 'B', // A/B/C
    price: Number(body.price ?? 0),
    images: Array.isArray(body.images) ? body.images : [],
    status: body.status ?? 'available', // available | rented | sold | inactive
    rental: {
      enabled: !!body?.rental?.enabled,
      deposit: Number(body?.rental?.deposit ?? 0),
      fee: {
        d7: Number(body?.rental?.fee?.d7 ?? 0),
        d15: Number(body?.rental?.fee?.d15 ?? 0),
        d30: Number(body?.rental?.fee?.d30 ?? 0),
      },
      disabledReason: String(body?.rental?.disabledReason ?? '').trim(),
    },
    quantity: Math.max(1, Number(body.quantity ?? 1)),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (doc.rental.enabled === false && !doc.rental.disabledReason) {
    return NextResponse.json({ message: '대여 불가 시 사유 입력이 필요합니다.' }, { status: 400 });
  }

  const brandOk = RACKET_BRANDS.some((b) => b.value === doc.brand);
  if (!brandOk) return NextResponse.json({ message: '브랜드 값이 유효하지 않습니다.' }, { status: 400 });

  // spec 숫자 필드 유효성(숫자/빈값/null만 허용)
  for (const k of ['weight', 'balance', 'headSize', 'lengthIn', 'swingWeight', 'stiffnessRa'] as const) {
    const v = (doc as any).spec?.[k];
    if (v !== null && v !== undefined && !Number.isFinite(v)) {
      return NextResponse.json({ message: `spec.${k} 값이 유효하지 않습니다.` }, { status: 400 });
    }
  }

  const res = await db.collection('used_rackets').insertOne(doc as any);
  return NextResponse.json({ ok: true, id: res.insertedId.toString() });
}
