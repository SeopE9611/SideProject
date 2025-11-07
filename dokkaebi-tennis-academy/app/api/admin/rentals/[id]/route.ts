import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/admin.guard';

function maskAccount(acct?: string) {
  if (!acct) return '';
  const last4 = String(acct).slice(-4);
  return `••••${last4}`;
}
function maskName(name?: string) {
  if (!name) return '';
  // 한 글자 이름: 그대로, 두 글자 이상: 마지막 글자만 노출
  if (name.length <= 1) return name;
  return name.slice(0, -1).replace(/./g, '•') + name.slice(-1);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!('ok' in guard) || !guard.ok) return guard.res;
  const db = guard.db;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'BAD_ID' }, { status: 400 });
  }

  const doc = await db.collection('rental_orders').findOne({ _id: new ObjectId(id) });
  if (!doc) return NextResponse.json({ message: 'Not Found' }, { status: 404 });

  // 고객 정보 조인
  let user: { name?: string; email?: string; phone?: string } | null = null;
  if (doc.userId) {
    const u = await db.collection('users').findOne({ _id: doc.userId });
    if (u) user = { name: u.name ?? '', email: u.email ?? '', phone: u.phone ?? '' };
  }

  // 환불계좌(관리자 전용, 마스킹)
  const refundAccount = doc.refundAccount
    ? {
        bank: doc.refundAccount.bank ?? '',
        holderMasked: maskName(doc.refundAccount.holder ?? ''),
        accountMasked: maskAccount(doc.refundAccount.account ?? ''),
      }
    : null;

  return NextResponse.json({
    id: doc._id.toString(),
    racketId: doc.racketId?.toString?.(),
    brand: doc.brand,
    model: doc.model,
    days: doc.days,
    status: typeof doc.status === 'string' ? doc.status.toLowerCase() : doc.status,
    amount: doc.amount, // { deposit, fee, total }
    createdAt: doc.createdAt,
    outAt: doc.outAt ?? null,
    dueAt: doc.dueAt ?? null,
    returnedAt: doc.returnedAt ?? null,
    depositRefundedAt: doc.depositRefundedAt ?? null,
    shipping: {
      outbound: doc.shipping?.outbound ?? null,
      return: doc.shipping?.return ?? null,
    },
    refundAccount, // 관리자만 확인 가능(마스킹)
    user,
  });
}
