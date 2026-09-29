import { applyAppsInTossCors, createAppsInTossPreflightResponse } from "@/lib/apps-in-toss";
import clientPromise from "@/lib/mongodb";
import { productVisibilityFilterFor } from "@/lib/public-visibility";
import { getVisibilityViewerFromCookies } from "@/lib/public-visibility-viewer";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

// 앱인토스 WebView의 단일 상품 조회 preflight 요청 처리
export function OPTIONS(req: NextRequest) {
  return createAppsInTossPreflightResponse(req.headers.get("origin"));
}

// 단일 상품 조회
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = req.headers.get("origin");

  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return applyAppsInTossCors(
        NextResponse.json({ message: "올바르지 않은 상품 ID입니다." }, { status: 400 }),
        origin,
      );
    }

    const client = await clientPromise;
    const db = client.db();
    const viewer = await getVisibilityViewerFromCookies();

    const prod = await db.collection("products").findOne({
      _id: new ObjectId(id),
      ...productVisibilityFilterFor(viewer),
    });

    if (!prod) {
      return applyAppsInTossCors(
        NextResponse.json({ message: "상품을 찾을 수 없습니다." }, { status: 404 }),
        origin,
      );
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

    return applyAppsInTossCors(response, origin);
  } catch (err) {
    console.error("[단일 상품 조회 오류]", err);

    return applyAppsInTossCors(
      NextResponse.json({ message: "서버 오류" }, { status: 500 }),
      origin,
    );
  }
}

// 상품 정보 업데이트
export { DELETE, PUT } from "@/app/api/admin/products/[id]/route";
