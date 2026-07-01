import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { productVisibilityFilterFor } from "@/lib/public-visibility";
import { getVisibilityViewerFromCookies } from "@/lib/public-visibility-viewer";

// 단일 상품 조회

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const { id } = await params;
    const viewer = await getVisibilityViewerFromCookies();
    const prod = await db.collection("products").findOne({
      _id: new ObjectId(id),
      ...productVisibilityFilterFor(viewer),
    });
    if (!prod) {
      return NextResponse.json({ message: "상품을 찾을 수 없습니다." }, { status: 404 });
    }
    const response = NextResponse.json({
      product: {
        ...prod,
        _id: prod._id.toString(),
      },
    });
    response.headers.set(
      "Cache-Control",
      viewer.isAdmin ? "no-store" : "public, s-maxage=30, stale-while-revalidate=60",
    );
    return response;
  } catch (err) {
    console.error("[단일 상품 조회 오류]", err);
    return NextResponse.json({ message: "서버 오류" }, { status: 500 });
  }
}

// 상품 정보 업데이트
export { PUT, DELETE } from "@/app/api/admin/products/[id]/route";
