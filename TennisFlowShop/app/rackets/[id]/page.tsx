import RacketDetailClient from "@/app/rackets/[id]/_components/RacketDetailClient";
import SiteContainer from "@/components/layout/SiteContainer";
import {
  getRacketActiveCountPayload,
  getRacketDetailPayload,
} from "@/lib/racket-detail.server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "중고 라켓 상세",
};

export const dynamic = "force-dynamic";

export default async function RacketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 성능 최적화 핵심:
  // - 기존에는 같은 서버 안의 /api/...를 다시 fetch 하면서 내부 네트워크 왕복 +
  //   route handler 재실행 + JSON 직렬화/역직렬화가 추가로 발생했다.
  // - page와 route가 동일한 DB 로직(helper)을 직접 재사용하면 같은 결과를 더 짧은 경로로 얻을 수 있다.
  // - 두 데이터는 서로 독립적이라 Promise.all 병렬 조회를 유지해 상세 체감 대기 시간을 줄인다.
  const [doc, stock] = await Promise.all([
    getRacketDetailPayload(id),
    getRacketActiveCountPayload(id),
  ]);

  if (!doc) {
    return (
      <div className="min-h-screen bg-muted/30">
        <SiteContainer variant="wide" className="py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">
              존재하지 않는 라켓입니다.
            </h1>
          </div>
        </SiteContainer>
      </div>
    );
  }

  const qty = Number(stock?.quantity ?? 1);
  const avail = Number.isFinite(stock?.available)
    ? Math.max(0, Number(stock?.available))
    : 0;

  return (
    <RacketDetailClient
      racket={doc}
      stock={{ quantity: qty, available: avail }}
    />
  );
}
