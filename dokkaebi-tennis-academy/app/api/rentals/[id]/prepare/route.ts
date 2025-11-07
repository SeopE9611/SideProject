import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';

export const dynamic = 'force-dynamic';

/**
 * [무통장 접수 전용] status 변경 없이 결제/배송 정보만 저장.
 * body: {
 *   payment?: { method: 'bank_transfer'; bank?: string; depositor?: string },
 *   shipping?: { name, phone, postalCode, address, addressDetail?, deliveryRequest? },
 *   refundAccount?: { bank: 'shinhan'|'kookmin'|'woori', account: string, holder: string }
 * }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: 'BAD_ID' }, { status: 400 });
    }
    const db = (await clientPromise).db();
    const _id = new ObjectId(id);
    const rental = await db.collection('rental_orders').findOne({ _id });
    if (!rental) return NextResponse.json({ ok: false, message: 'NOT_FOUND' }, { status: 404 });

    // 1차 보호: 회원 대여건이면 소유자만 수정 가능 (비회원 보류)
    if (rental.userId) {
      const jar = await cookies();
      const at = jar.get('accessToken')?.value;
      const payload = at ? verifyAccessToken(at) : null;
      if (!payload || payload.sub !== String(rental.userId)) {
        return NextResponse.json({ ok: false, message: 'FORBIDDEN' }, { status: 403 });
      }
    }
    const body = await (async () => {
      try {
        return await req.json();
      } catch {
        return {};
      }
    })();

    await db.collection('rental_orders').updateOne(
      { _id },
      {
        $set: {
          payment: body?.payment ?? null, // 은행/입금자명 보관
          shipping: body?.shipping ?? null, // 배송지 보관
          refundAccount: body?.refundAccount ?? null,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error('POST /api/rentals/[id]/prepare error:', err);
    return NextResponse.json({ ok: false, message: 'SERVER_ERROR' }, { status: 500 });
  }
}
