import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { getDb } from '@/lib/mongodb';

// “개별 아이템” 한 개만 제거 - 해당 productId 한 건만 삭제(deleteOne)

function safeVerifyAccessToken(token?: string | null) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    const user = safeVerifyAccessToken(token);
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = String((user as any).sub ?? '');
    if (!ObjectId.isValid(userId)) return NextResponse.json({ error: 'Invalid token payload' }, { status: 400 });


    const { productId } = await params;
    const db = await getDb();
    await db.collection('wishlists').deleteOne({
      userId: new ObjectId(userId),
      productId: new ObjectId(productId),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[wishlist] DELETE error', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
