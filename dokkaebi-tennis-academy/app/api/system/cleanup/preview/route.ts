import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { subDays } from 'date-fns';

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const cutoffDate = subDays(new Date(), 7);
  const client = await clientPromise;
  const users = await client
    .db()
    .collection('users')
    .find({
      isDeleted: true,
      deletedAt: { $lt: cutoffDate },
    })
    .project({ name: 1, email: 1 })
    .toArray();

  return NextResponse.json(users);
}
