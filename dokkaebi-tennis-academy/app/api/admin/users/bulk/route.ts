import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { ObjectId } from 'mongodb';

type Op = 'suspend' | 'unsuspend' | 'softDelete' | 'restore';

export async function POST(req: Request) {
  // 관리자 인증
  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload?.sub || payload.role !== 'admin') {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { op, ids } = body as { op?: Op; ids?: string[] };
  if (!op || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ message: 'op and ids are required' }, { status: 400 });
  }

  const _ids = ids.filter(ObjectId.isValid).map((id) => new ObjectId(id));
  if (_ids.length === 0) return NextResponse.json({ message: 'no valid ids' }, { status: 400 });

  const db = await getDb();
  const col = db.collection('users');

  let $set: Record<string, any> = {};
  switch (op) {
    case 'suspend':
      $set = { isSuspended: true, suspendedAt: new Date() };
      break;
    case 'unsuspend':
      $set = { isSuspended: false, suspendedAt: null };
      break;
    case 'softDelete':
      $set = { isDeleted: true, deletedAt: new Date() };
      break;
    case 'restore':
      $set = { isDeleted: false, deletedAt: null };
      break;
    default:
      return NextResponse.json({ message: 'invalid op' }, { status: 400 });
  }

  const res = await col.updateMany({ _id: { $in: _ids } }, { $set });
  return NextResponse.json({ matchedCount: res.matchedCount, modifiedCount: res.modifiedCount });
}
