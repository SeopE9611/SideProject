import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin.guard";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ message: "유효하지 않은 상품 ID입니다." }, { status: 400 });
  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) return NextResponse.json({ message: "페이지 번호를 확인해주세요." }, { status: 400 });
  const limit = 20;
  const productId = new ObjectId(id);
  try {
    const logs = guard.db.collection("product_stock_events");
    const [docs, total] = await Promise.all([
      logs.find({ productId }, { projection: { occurredAt: 1, reason: 1, mode: 1, changes: 1, orderId: 1, applicationId: 1 } })
        .sort({ occurredAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      logs.countDocuments({ productId }),
    ]);
    return NextResponse.json({ items: docs.map((doc) => ({ ...doc, _id: String(doc._id) })), page, limit, total });
  } catch (error) {
    console.error("[admin/products/stock-history]", error);
    return NextResponse.json({ message: "재고 변경 이력을 불러오지 못했습니다." }, { status: 500 });
  }
}
