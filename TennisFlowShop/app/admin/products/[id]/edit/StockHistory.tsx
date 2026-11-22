"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { Button } from "@/components/ui/button";
import type { StockQuantityChange } from "@/lib/product-stock-audit";

type HistoryResponse = { items: Array<{ _id: string; occurredAt: string; reason: string; mode: string; changes: StockQuantityChange[]; orderId?: string; applicationId?: string }>; page: number; limit: number; total: number };
const reasons: Record<string, string> = { order_created: "주문 생성", order_canceled: "주문 취소", admin_product_updated: "관리자 상품 수정" };

export default function StockHistory({ productId }: { productId: string }) {
  const [page, setPage] = useState(1);
  const { data, error, isLoading } = useSWR<HistoryResponse>(`/api/admin/products/${productId}/stock-history?page=${page}`, authenticatedSWRFetcher);
  return (
    <section className="space-y-3 rounded-lg border p-4" aria-label="재고 변경 이력">
      <h2 className="font-semibold">재고 변경 이력</h2>
      <p className="text-sm text-muted-foreground">감사 기록 도입 이후 주문 생성·주문 취소·관리자 수정 이력을 제공합니다. 독립 교체서비스·대여 경로와 도입 전 과거 이력은 포함되지 않을 수 있습니다.</p>
      {error ? <p role="alert">재고 변경 이력을 불러오지 못했습니다.</p> : isLoading ? <p role="status">불러오는 중...</p> : data?.items.length ? (
        <ul className="space-y-3">
          {data.items.map((item) => (
            <li key={item._id} className="space-y-1 border-t pt-3 text-sm">
              <p>{new Date(item.occurredAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} · {reasons[item.reason] ?? "재고 변경"} · {item.mode === "admin" ? "관리자 수동" : "자동 처리"}</p>
              {item.changes.map((change, index) => <p key={index}>{change.axis === "total" ? "전체" : change.axis === "variant" ? "조합" : change.axis === "color" ? "색상" : "게이지"}{change.color ? ` · ${change.color}` : ""}{change.gauge ? ` · ${change.gauge}` : ""}: {change.before ?? "기록 없음"} → {change.after ?? "기록 없음"} ({change.delta == null ? "증감 확인 필요" : `${change.delta > 0 ? "+" : ""}${change.delta}`})</p>)}
              {item.orderId && /^[a-f\d]{24}$/i.test(item.orderId) && <Link className="mr-3 underline" href={`/admin/orders/${item.orderId}`}>관련 주문</Link>}
              {item.applicationId && /^[a-f\d]{24}$/i.test(item.applicationId) && <Link className="underline" href={`/admin/applications/stringing/${item.applicationId}`}>관련 신청서</Link>}
            </li>
          ))}
        </ul>
      ) : <p>기록된 재고 변경 이력이 없습니다.</p>}
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" disabled={page === 1 || isLoading} onClick={() => setPage((value) => value - 1)}>이전</Button>
        <span>{page}페이지</span>
        <Button type="button" variant="outline" size="sm" disabled={!data || page * data.limit >= data.total || isLoading || Boolean(error)} onClick={() => setPage((value) => value + 1)}>다음</Button>
      </div>
    </section>
  );
}
