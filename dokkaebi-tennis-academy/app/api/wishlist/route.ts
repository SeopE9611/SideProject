import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { getDb } from '@/lib/mongodb';

// 내 위시리스트 목록 + 상품 요약

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
    const user = safeVerifyAccessToken(token);
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = String((user as any).sub ?? '');
    if (!ObjectId.isValid(userId)) return NextResponse.json({ error: 'Invalid token payload' }, { status: 400 });


    const db = await getDb();
    const wishlists = db.collection('wishlists');
    const products = db.collection('products');

    // 중복 방지 인덱스
    await wishlists.createIndex({ userId: 1, productId: 1 }, { unique: true });

    const rows = await wishlists
      .aggregate([
        { $match: { userId: new ObjectId(userId) } },
        { $sort: { createdAt: -1, _id: -1 } },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product',
            pipeline: [{ $match: { isDeleted: { $ne: true } } }, { $project: { name: 1, price: 1, images: 1, inventory: 1 } }],
          },
        },
        { $unwind: '$product' },
        {
          $project: {
            _id: 0,
            productId: 1,
            createdAt: 1,
            product: 1,
          },
        },
      ])
      .toArray();

    return NextResponse.json({
      items: rows.map((r) => ({
        id: r.productId.toString(),
        name: r.product.name,
        price: r.product.price,
        image: r.product.images?.[0] || '/placeholder.svg',
        stock: r.product?.inventory?.stock ?? 0,
        createdAt: r.createdAt,
      })),
      total: rows.length,
    });
  } catch (e) {
    console.error('[wishlist] GET error', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

//  { productId } 상품 한개 추가(이미 있으면 409)
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    const user = safeVerifyAccessToken(token);
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = String((user as any).sub ?? '');
    if (!ObjectId.isValid(userId)) return NextResponse.json({ error: 'Invalid token payload' }, { status: 400 });

    let body: any = null;
    try {
      body = await req.json();
    } catch (e) {
      console.error('[wishlist] invalid json', e);
      return NextResponse.json({ message: 'INVALID_JSON' }, { status: 400 });
    }

    const productId = body?.productId;
    if (typeof productId !== 'string' || !productId) {
      return NextResponse.json({ message: 'INVALID_PRODUCT_ID' }, { status: 400 });
    }
    if (!productId) return NextResponse.json({ message: 'productId required' }, { status: 400 });
    if (!ObjectId.isValid(String(productId))) return NextResponse.json({ error: 'Invalid productId' }, { status: 400 });

    const db = await getDb();
    const wishlists = db.collection('wishlists');
    const products = db.collection('products');

    const prod = await products.findOne({ _id: new ObjectId(productId), isDeleted: { $ne: true } });
    if (!prod) return NextResponse.json({ message: 'Product not found' }, { status: 404 });

    await wishlists.createIndex({ userId: 1, productId: 1 }, { unique: true });

    await wishlists.insertOne({
      userId: new ObjectId(userId),
      productId: new ObjectId(productId),
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.code === 11000) {
      return NextResponse.json({ message: 'Already in wishlist' }, { status: 409 });
    }
    console.error('[wishlist] POST error', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// 컬렉션 전체에서 내 위시리스트 전부 비우기
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    const user = safeVerifyAccessToken(token);
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = String((user as any).sub ?? '');
    if (!ObjectId.isValid(userId)) return NextResponse.json({ error: 'Invalid token payload' }, { status: 400 });

    const db = await getDb();
    await db.collection('wishlists').deleteMany({ userId: new ObjectId(userId) });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[wishlist] DELETE ALL error', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
