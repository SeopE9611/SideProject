"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Scissors,
  Plus,
  HelpCircle,
  Tags,
  Wrench,
  Search,
  Package,
  Truck,
  Hand,
  Clock,
  MessageCircle,
  Star,
  ChevronRight,
  Menu,
  ShoppingBag,
  PhoneCall,
} from "lucide-react";

import { cn } from "@/lib/utils";

/* ----------------------------- 상황 선택 데이터 ----------------------------- */

type SituationKey = "broken" | "newRacket" | "unsure" | "price";

type Situation = {
  key: SituationKey;
  icon: typeof Scissors;
  label: string;
};

const SITUATIONS: Situation[] = [
  { key: "broken", icon: Scissors, label: "스트링이 끊어졌어요" },
  { key: "newRacket", icon: Plus, label: "새 라켓에 매고 싶어요" },
  { key: "unsure", icon: HelpCircle, label: "어떤 스트링이 맞는지 몰라요" },
  { key: "price", icon: Tags, label: "가격이 궁금해요" },
];

type ActionCta = { label: string; href: string; primary?: boolean };

type RecommendedAction = {
  eyebrow: string;
  title: string;
  description: string;
  ctas: ActionCta[];
};

const ACTIONS: Record<SituationKey, RecommendedAction> = {
  broken: {
    eyebrow: "빠른 교체",
    title: "오늘 바로 스트링을 교체하세요",
    description:
      "끊어진 스트링은 빠른 접수가 중요해요. 방문 또는 택배로 신청하면 평균 1~2일 내 교체해 드립니다.",
    ctas: [
      { label: "스트링 교체 신청", href: "/services", primary: true },
      { label: "운영 시간 확인", href: "/support" },
    ],
  },
  newRacket: {
    eyebrow: "신규 장착",
    title: "새 라켓에 딱 맞는 스트링을 매드려요",
    description:
      "라켓 스펙과 플레이 스타일에 맞춰 텐션과 스트링을 추천하고 깔끔하게 장착해 드립니다.",
    ctas: [
      { label: "교체 신청하기", href: "/services", primary: true },
      { label: "라켓 둘러보기", href: "/rackets" },
    ],
  },
  unsure: {
    eyebrow: "맞춤 추천",
    title: "내게 맞는 스트링을 찾아드려요",
    description:
      "내구성·반발력·타구감 중 무엇이 중요한지 알려주시면 플레이 스타일에 맞는 스트링을 추천해 드립니다.",
    ctas: [
      { label: "스트링 추천 받기", href: "/support", primary: true },
      { label: "인기 스트링 보기", href: "/products" },
    ],
  },
  price: {
    eyebrow: "가격 안내",
    title: "장착비와 패키지를 한눈에",
    description:
      "스트링 단품 교체비와 합리적인 정기 패키지 요금을 투명하게 안내해 드립니다.",
    ctas: [
      { label: "가격·패키지 보기", href: "/services/packages", primary: true },
      { label: "Q&A 문의", href: "/support" },
    ],
  },
};

/* ------------------------------- 프로세스 데이터 ------------------------------- */

const PROCESS_STEPS = [
  { icon: MessageCircle, title: "상담·접수", desc: "온라인 신청 또는 문의" },
  { icon: Truck, title: "방문·택배", desc: "매장 방문 또는 택배 발송" },
  { icon: Wrench, title: "스트링 선택", desc: "텐션·스트링 맞춤 장착" },
  { icon: Hand, title: "수령", desc: "방문 수령 또는 배송" },
];

/* ------------------------------- 인기 스트링 데이터 ------------------------------- */

const POPULAR_STRINGS = [
  { id: "1", brand: "Luxilon", name: "ALU Power 125", price: 28000, img: "/concept/string-1.png", badge: "인기" },
  { id: "2", brand: "Babolat", name: "RPM Blast 17", price: 25000, img: "/concept/string-2.png", badge: "추천" },
  { id: "3", brand: "Wilson", name: "Natural Gut 16", price: 52000, img: "/concept/string-3.png" },
  { id: "4", brand: "Yonex", name: "Poly Tour Pro", price: 24000, img: "/concept/string-4.png", badge: "NEW" },
];

/* -------------------------------- 신뢰/안내 데이터 -------------------------------- */

const TRUST_ITEMS = [
  { icon: Tags, title: "장착비 안내", desc: "단품 8,000원~", href: "/services/packages" },
  { icon: Clock, title: "운영 시간", desc: "평일 10–20시", href: "/support" },
  { icon: PhoneCall, title: "Q&A 문의", desc: "1:1 상담 접수", href: "/support" },
  { icon: Star, title: "고객 후기", desc: "실사용 리뷰 보기", href: "/reviews" },
];

const NOTICES = [
  { id: "1", tag: "공지", title: "추석 연휴 교체 서비스 운영 안내" },
  { id: "2", tag: "안내", title: "택배 접수 포장 가이드 업데이트" },
];

const NAV_ITEMS = [
  { label: "스트링", href: "/products", icon: ShoppingBag },
  { label: "라켓", href: "/rackets", icon: Package },
  { label: "서비스", href: "/services", icon: Wrench },
  { label: "아카데미", href: "/academy", icon: Star },
  { label: "고객센터", href: "/support", icon: MessageCircle },
];

const formatPrice = (v: number) => `${v.toLocaleString("ko-KR")}원`;

/* ----------------------------------- 화면 ----------------------------------- */

export default function MobileHomeConcept() {
  const [active, setActive] = useState<SituationKey>("broken");
  const action = ACTIONS[active];

  return (
    <div className="min-h-screen bg-muted/40 py-6">
      {/* 모바일 프레임 */}
      <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-[2rem] border border-border bg-background shadow-xl">
        {/* 상단 앱 바 */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
          <span className="font-brand-bold text-lg tracking-tight text-foreground">
            도깨비테니스
          </span>
          <button
            type="button"
            aria-label="메뉴 열기"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:bg-secondary"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="flex flex-col gap-8 px-4 pb-28 pt-5">
          {/* 1. Hero */}
          <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              스트링 교체 · 라켓 · 아카데미
            </p>
            <h1 className="font-brand-bold text-2xl leading-snug text-balance text-foreground">
              내 라켓에 딱 맞는 스트링,
              <br />
              빠르고 정확하게 매드립니다
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              방문도 택배도 OK. 도깨비테니스가 텐션부터 장착까지 책임집니다.
            </p>
            <div className="mt-1 flex flex-col gap-2">
              <Link
                href="/services"
                className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
              >
                스트링 교체 신청
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/products"
                className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-5 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                <ShoppingBag className="h-4 w-4" />
                스트링 쇼핑하기
              </Link>
            </div>
          </section>

          {/* 2. 상황 선택 */}
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="font-brand-bold text-lg text-foreground">
                지금 어떤 도움이 필요하세요?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                상황을 선택하면 다음 행동을 추천해 드려요.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {SITUATIONS.map((s) => {
                const isActive = active === s.key;
                const Icon = s.icon;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setActive(s.key)}
                    aria-pressed={isActive}
                    className={cn(
                      "flex flex-col gap-2 rounded-2xl border p-4 text-left transition-all",
                      isActive
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/40 hover:shadow-sm",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
                        isActive
                          ? "border-primary/30 bg-primary text-primary-foreground"
                          : "border-border bg-secondary text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium leading-snug text-foreground">
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 3. 추천 액션 카드 */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
                {action.eyebrow}
              </span>
              <h3 className="mt-3 font-brand-bold text-base text-foreground text-balance">
                {action.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {action.description}
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {action.ctas.map((cta) => (
                  <Link
                    key={cta.label}
                    href={cta.href}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                      cta.primary
                        ? "bg-primary text-primary-foreground hover:opacity-90"
                        : "border border-border bg-background text-foreground hover:bg-secondary",
                    )}
                  >
                    {cta.label}
                    {cta.primary && <ArrowRight className="h-4 w-4" />}
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* 4. 스트링 교체 프로세스 */}
          <section className="flex flex-col gap-4">
            <h2 className="font-brand-bold text-lg text-foreground">교체는 이렇게 진행돼요</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {PROCESS_STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="relative flex flex-col gap-2 rounded-2xl border border-border bg-card p-4"
                  >
                    <span className="absolute right-3 top-3 text-xs font-semibold text-muted-foreground">
                      0{i + 1}
                    </span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary text-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold text-foreground">{step.title}</span>
                    <span className="text-xs leading-relaxed text-muted-foreground">
                      {step.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 5. 인기 스트링 (가로 스크롤) */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-brand-bold text-lg text-foreground">인기 스트링</h2>
              <Link
                href="/products"
                className="flex items-center gap-0.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                전체보기
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
              {POPULAR_STRINGS.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="group w-40 shrink-0 overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-square w-full bg-secondary">
                    <Image
                      src={p.img || "/placeholder.svg"}
                      alt={p.name}
                      fill
                      sizes="160px"
                      className="object-cover"
                    />
                    {p.badge && (
                      <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                        {p.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 p-3">
                    <span className="text-xs text-muted-foreground">{p.brand}</span>
                    <span className="line-clamp-1 text-sm font-medium text-foreground">
                      {p.name}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {formatPrice(p.price)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* 6. 신뢰/안내 */}
          <section className="flex flex-col gap-4">
            <h2 className="font-brand-bold text-lg text-foreground">이용 안내</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {TRUST_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-secondary"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">{item.title}</span>
                      <span className="text-xs text-muted-foreground">{item.desc}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* 7. 공지사항 (보조) */}
          <section className="rounded-2xl border border-border bg-muted/50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">공지사항</h2>
              <Link
                href="/board/notice"
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                더보기
              </Link>
            </div>
            <ul className="flex flex-col divide-y divide-border">
              {NOTICES.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/board/notice/${n.id}`}
                    className="flex items-center gap-2 py-2.5 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <span className="shrink-0 rounded-md bg-background px-2 py-0.5 text-xs font-medium text-foreground">
                      {n.tag}
                    </span>
                    <span className="line-clamp-1">{n.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </main>

        {/* 하단 탭 네비게이션 */}
        <nav className="sticky bottom-0 z-20 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center gap-1 py-2.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Icon className="h-5 w-5" />
                <span className="text-[11px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
