import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { ObjectId } from 'mongodb';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const token = (await cookies()).get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload?.sub || payload.role !== 'admin') {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }

  const { id } = params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'invalid id' }, { status: 400 });
  }

  const db = await getDb();
  const u = await db.collection('users').findOne(
    { _id: new ObjectId(id) },
    {
      projection: {
        _id: 1,
        name: 1,
        email: 1,
        phone: 1,
        role: 1,
        isDeleted: 1,
        address: 1,
        addressDetail: 1,
        postalCode: 1,
        createdAt: 1,
        updatedAt: 1,
        lastLoginAt: 1,
      },
    }
  );

  if (!u) return NextResponse.json({ message: 'not found' }, { status: 404 });

  return NextResponse.json({
    id: u._id.toString(),
    name: u.name ?? '',
    email: u.email ?? '',
    phone: u.phone ?? '',
    role: u.role ?? 'user',
    isDeleted: !!u.isDeleted,
    address: u.address ?? '',
    addressDetail: u.addressDetail ?? '',
    postalCode: u.postalCode ?? '',
    createdAt: u.createdAt ?? null,
    updatedAt: u.updatedAt ?? null,
    lastLoginAt: u.lastLoginAt ?? null,
  });
}
