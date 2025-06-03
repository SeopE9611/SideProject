import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import { deleteExpiredAccounts } from '@/lib/deleteExpiredAccounts';

export async function GET(req: Request) {
  const session = await auth();

  // 로그인 안 되어 있거나 관리자가 아니면 403
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const deletedCount = await deleteExpiredAccounts();
  return NextResponse.json({ deletedCount });
}
