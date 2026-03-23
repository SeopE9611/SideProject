import RacketDetailClient from "@/app/rackets/[id]/_components/RacketDetailClient";
import SiteContainer from "@/components/layout/SiteContainer";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

async function absoluteUrl(path: string) {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}${path}` : path; // 드문 케이스 폴백
}

async function getDataByUrl(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

async function getStockByUrl(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return { ok: false, quantity: 1, available: 0 };
  return res.json();
}

export default async function RacketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 상세 페이지 성능 최적화 포인트:
  // 1) 내부 API 호출은 유지하되(기존 응답 스키마/권한 처리 보존),
  // 2) 기존 순차 fetch(라켓 조회 -> 재고 조회)를 병렬 fetch로 전환한다.
  //    - 순차 구조는 두 번째 요청이 첫 번째 완료 후 시작되어 체감 대기 시간이 늘어난다.
  //    - 두 API는 서로 의존성이 없으므로 Promise.all 병렬화가 가능하다.
  const [dataUrl, stockUrl] = await Promise.all([
    absoluteUrl(`/api/rackets/${id}`),
    absoluteUrl(`/api/rentals/active-count/${id}`),
  ]);

  const [doc, stock] = await Promise.all([
    getDataByUrl(dataUrl),
    getStockByUrl(stockUrl),
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
