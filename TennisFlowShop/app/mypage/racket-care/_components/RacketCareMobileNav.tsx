"use client";

import type { CareItem } from "@/app/mypage/racket-care/_components/racket-care-client.types";
import Link from "next/link";

export default function RacketCareMobileNav({ item }: { item: CareItem }) {
  return <nav className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-border bg-card/95 p-2 shadow-lg backdrop-blur bp-lg:hidden" style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }} aria-label="라켓 케어 바로가기"><div className="grid grid-cols-4 gap-1 text-ui-label"><a className="rounded-xl p-2 text-center" href="#racket-care-items" aria-current="page">내 라켓</a><a className="rounded-xl p-2 text-center" href="#racket-care-status">상태 진단</a><Link className="rounded-xl p-2 text-center" href={`/products/recommend?from=racket-care&careItemId=${item.id}&freq=${item.playFrequency}`}>맞춤 추천</Link><a className="rounded-xl p-2 text-center" href="#racket-care-reminder">알림 관리</a></div></nav>;
}
