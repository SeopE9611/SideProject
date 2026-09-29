import RacketDetailClient from "@/app/rackets/[id]/_components/RacketDetailClient";
import { CommerceDetailResultState } from "@/components/commerce/detail";
import { verifyAccessToken } from "@/lib/auth.utils";
import { getRacketActiveCountPayload, getRacketDetailPayload } from "@/lib/racket-detail.server";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "중고 라켓 상세",
};

export const dynamic = "force-dynamic";

function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

function getViewerFromPayload(payload: any) {
  const sub = payload?.sub ? String(payload.sub) : "";
  const userId = sub && ObjectId.isValid(sub) ? new ObjectId(sub) : null;
  const isAdmin =
    payload?.role === "admin" ||
    payload?.role === "ADMIN" ||
    payload?.isAdmin === true ||
    (Array.isArray(payload?.roles) && payload.roles.includes("admin"));
  return { userId, isAdmin };
}

export default async function RacketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const token = (await cookies()).get("accessToken")?.value;
  const viewer = getViewerFromPayload(safeVerifyAccessToken(token));

  // 성능 최적화 핵심:
  // - 기존에는 같은 서버 안의 /api/...를 다시 fetch 하면서 내부 네트워크 왕복 +
  //   route handler 재실행 + JSON 직렬화/역직렬화가 추가로 발생했다.
  // - page와 route가 동일한 DB 로직(helper)을 직접 재사용하면 같은 결과를 더 짧은 경로로 얻을 수 있다.
  // - 두 데이터는 서로 독립적이라 Promise.all 병렬 조회를 유지해 상세 체감 대기 시간을 줄인다.
  const [doc, stock] = await Promise.all([
    getRacketDetailPayload(id, viewer),
    getRacketActiveCountPayload(id),
  ]);

  if (!doc) {
    return (
      <CommerceDetailResultState
        eyebrow="라켓 상세"
        title="라켓을 찾을 수 없습니다"
        description="요청하신 라켓이 없거나 현재 공개되어 있지 않습니다."
        stateTitle="다른 라켓을 둘러보세요"
        stateDescription="라켓 목록에서 원하는 라켓을 찾아보세요."
        listHref="/rackets"
        listLabel="라켓 목록으로 이동"
      />
    );
  }

  const qty = Number(stock?.quantity ?? 1);
  const avail = Number.isFinite(stock?.available) ? Math.max(0, Number(stock?.available)) : 0;

  return <RacketDetailClient racket={doc} stock={{ quantity: qty, available: avail }} />;
}
