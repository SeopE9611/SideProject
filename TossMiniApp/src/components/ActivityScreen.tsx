import { Top } from "@toss/tds-mobile";
import { useCallback, useEffect, useState } from "react";

import { getAppsActivity, type AppsActivity } from "../api/activity";
import { ApiError } from "../api/http";
import { useAppsInTossAuth } from "../auth/AppsInTossAuthContext";
import { formatGaugeLabel, formatPrice, getStringColorLabel } from "../lib/product-labels";

export default function ActivityScreen({ onHome }: { onHome: () => void }) {
  const auth = useAppsInTossAuth();
  const [items, setItems] = useState<AppsActivity[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const load = useCallback(async (signal?: AbortSignal) => {
    if (auth.status !== "authenticated") { setItems([]); setState("idle"); return; }
    setState("loading");
    try { const result = await getAppsActivity(auth.sessionToken, signal); setItems(result.activities); setState("success"); }
    catch (error) { if (signal?.aborted) return; if (error instanceof ApiError && error.status === 401) { auth.clearSession(); setItems([]); } setState("error"); }
  }, [auth]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const login = async () => { try { await auth.login(); } catch { setState("error"); } };
  return <main className="min-h-dvh bg-white pb-[calc(32px+env(safe-area-inset-bottom))] text-[#191f28]">
    <section className="pt-[calc(16px+env(safe-area-inset-top))]"><Top title={<Top.TitleParagraph size={22}>내 이용내역</Top.TitleParagraph>} subtitleBottom={<Top.SubtitleParagraph size={17}>MiniApp에서 접수한 주문과 교체서비스</Top.SubtitleParagraph>} /></section>
    <section className="px-6">
      <button type="button" className="mb-5 border-0 bg-transparent p-0 text-sm font-bold text-[#688d00]" onClick={onHome}>홈으로</button>
      {auth.status !== "authenticated" && <div className="rounded-[20px] bg-[#f2f4f6] p-5 text-center"><p className="m-0 text-sm text-[#6b7684]">이용내역을 확인하려면 토스 로그인이 필요해요.</p><button className="mt-4 min-h-[48px] w-full rounded-2xl border-0 bg-[#191f28] font-bold text-white" onClick={() => void login()}>토스로 로그인하기</button></div>}
      {auth.status === "authenticated" && state === "loading" && <p role="status">이용내역을 불러오고 있어요.</p>}
      {auth.status === "authenticated" && state === "error" && <div role="alert"><p>이용내역을 불러오지 못했어요.</p><button type="button" onClick={() => void load()}>다시 시도</button></div>}
      {auth.status === "authenticated" && state === "success" && items.length === 0 && <p className="rounded-[20px] bg-[#f2f4f6] p-6 text-center text-sm text-[#6b7684]">아직 MiniApp에서 접수한 이용내역이 없어요.</p>}
      {auth.status === "authenticated" && state === "success" && <ul className="m-0 list-none space-y-3 p-0">{items.map((item) => {
        const purchase = item.activityType === "racket_purchase";
        const option = [getStringColorLabel(item.color), formatGaugeLabel(item.gauge)].filter(Boolean).join(" · ");
        return <li key={item.id} className="rounded-[20px] border border-[#e5e8eb] p-5">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${purchase ? "bg-[#e9f6c9] text-[#344700]" : "bg-[#f2f4f6] text-[#4e5968]"}`}>{purchase ? "라켓 구매" : "교체서비스"}</span>
          <strong className="mt-3 block text-[17px]">{item.productName}</strong>
          {purchase && item.stringName ? <p className="mt-1 mb-0 text-sm text-[#4e5968]">스트링 {item.stringName}</p> : null}
          {option ? <p className="mt-1 mb-0 text-sm text-[#6b7684]">{option}{purchase ? ` · ${item.quantity ?? 1}개` : ""}</p> : null}
          <p className="mt-2 mb-0 text-sm text-[#6b7684]">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("ko-KR") : "신청일 확인 중"} · {item.collectionMethod === "visit" ? (purchase ? "방문 수령" : "방문 접수") : (purchase ? "택배 배송" : "직접 발송")}</p>
          {item.collectionMethod === "visit" && item.preferredDate ? <p className="mt-1 mb-0 text-sm">방문 {item.preferredDate} {item.preferredTime ?? ""}</p> : null}
          <div className="mt-4 flex justify-between gap-3 text-sm"><span>{item.status} · {item.paymentStatus}</span><b>{formatPrice(item.amount)}</b></div>
        </li>;
      })}</ul>}
    </section>
  </main>;
}
