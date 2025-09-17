import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { ObjectId, Db } from 'mongodb';

type GuardOk = { ok: true; db: Db; admin: { _id: ObjectId; email?: string; name?: string; role: string } };
type GuardFail = { ok: false; res: NextResponse };

export async function requireAdmin(req: Request): Promise<GuardOk | GuardFail> {
  const jar = await cookies();
  const at = jar.get('accessToken')?.value;
  if (!at) return { ok: false, res: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };

  const payload = verifyAccessToken(at);
  if (!payload?.sub) return { ok: false, res: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };

  const db = await getDb();
  const admin = await db.collection('users').findOne({ _id: new ObjectId(payload.sub) }, { projection: { _id: 1, email: 1, name: 1, role: 1 } });
  if (!admin || admin.role !== 'admin') {
    return { ok: false, res: NextResponse.json({ message: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true, db, admin: admin as any };
}
