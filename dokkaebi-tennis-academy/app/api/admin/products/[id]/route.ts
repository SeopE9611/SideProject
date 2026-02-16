import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getHangulInitials } from '@/lib/hangul-utils';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  try {
    const body: any = await req.json();
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: '유효하지 않은 상품 ID입니다.' }, { status: 400 });
    }

    const updateData: any = {
      name: body.name,
      sku: body.sku,
      shortDescription: body.shortDescription,
      description: body.description,
      brand: body.brand,
      material: body.material,
      gauge: body.gauge,
      color: body.color,
      length: body.length,
      mountingFee: body.mountingFee,
      price: body.price,
      features: body.features,
      tags: body.tags,
      specifications: body.specifications,
      additionalFeatures: body.additionalFeatures,
      images: body.images,
      inventory: body.inventory,
      searchKeywords: Array.isArray(body.searchKeywords) ? body.searchKeywords : [],
      searchInitials: getHangulInitials(body.name),
      brandInitials: getHangulInitials(body.brand),
    };

    const db = await getDb();
    const result = await db.collection('products').updateOne({ _id: new ObjectId(id) }, { $set: updateData });
    if (result.matchedCount === 0) {
      return NextResponse.json({ message: '상품 업데이트 실패' }, { status: 500 });
    }
    return NextResponse.json({ message: '상품이 성공적으로 업데이트되었습니다.' });
  } catch (err) {
    console.error('[admin/products/[id]] update error', err);
    return NextResponse.json({ message: '서버 오류' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: '유효하지 않은 상품 ID입니다.' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const result = await db.collection('products').updateOne({ _id: new ObjectId(id) }, { $set: { isDeleted: true, deletedAt: new Date() } });

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: '상품을 찾을 수 없습니다.' }, { status: 404 });
    }
    return NextResponse.json({ message: '상품이 삭제되었습니다.' }, { status: 200 });
  } catch (err) {
    console.error('[admin/products/[id]] delete error', err);
    return NextResponse.json({ message: '서버 오류' }, { status: 500 });
  }
}
