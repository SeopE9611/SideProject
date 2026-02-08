import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

export const dynamic = 'force-dynamic';

// verifyAccessToken은 throw 가능 → 안전하게 null 처리(500 방지)
function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

async function requireAdmin() {
  const at = (await cookies()).get('accessToken')?.value;
  const payload = safeVerifyAccessToken(at);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // 관리자 인증
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

  // 파라미터/바디 검증
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ ok: false, message: 'BAD_ID' }, { status: 400 });
  const { courier = '', trackingNumber = '', shippedAt } = await req.json().catch(() => ({}));
  if (!courier || !trackingNumber) return NextResponse.json({ ok: false, message: 'MISSING_FIELDS' }, { status: 400 });

  // 저장
  const db = (await clientPromise).db();
  await db.collection('rental_orders').updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        'shipping.outbound': {
          courier,
          trackingNumber,
          shippedAt: shippedAt ? new Date(shippedAt) : new Date(),
        },
        updatedAt: new Date(),
      },
    },
  );

  return NextResponse.json({ ok: true });
}
