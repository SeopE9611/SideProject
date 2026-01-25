import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';


function safeVerifyAccessToken(token?: string | null) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = verifyAccessToken(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = String((user as any).sub ?? '');
  if (!ObjectId.isValid(userId)) return NextResponse.json({ error: 'Invalid token payload' }, { status: 400 });


    const client = await clientPromise;
    const db = client.db();
    const now = new Date();

    const passes = await db
      .collection('service_passes')
      .find({ userId: new ObjectId(userId) })
      .sort({ expiresAt: 1 })
      .limit(100)
      .toArray();

    const data = passes.map((p: any) => ({
      id: p._id.toString(),
      packageSize: p.packageSize,
      usedCount: p.usedCount,
      remainingCount: p.remainingCount,
      status: p.status,
      purchasedAt: p.purchasedAt,
      expiresAt: p.expiresAt,
      planId: p.meta?.planId ?? null,
      planTitle: p.meta?.planTitle ?? null,
      isExpiringSoon: p.status === 'active' && new Date(p.expiresAt).getTime() - now.getTime() <= 7 * 86400000,
      recentUsages: (p.redemptions ?? []).slice(-5).map((r: any) => ({
        applicationId: r.applicationId?.toString?.() ?? null,
        usedAt: r.usedAt,
        reverted: !!r.reverted,
      })),
    }));

    return NextResponse.json({ items: data });
  } catch (e) {
    console.error('[GET /api/passes/me] error', e);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
