import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { getDb } from '@/lib/mongodb';

// “개별 아이템” 한 개만 제거 - 해당 productId 한 건만 삭제(deleteOne)
export async function DELETE(_req: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    const user = token ? verifyAccessToken(token) : null;
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { productId } = await params;
    const db = await getDb();
    await db.collection('wishlists').deleteOne({
      userId: new ObjectId(user.sub),
      productId: new ObjectId(productId),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[wishlist] DELETE error', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
