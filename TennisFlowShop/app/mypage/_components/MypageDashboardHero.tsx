"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSocialProviderBadgeSpec } from "@/lib/badge-style";
import { getUserRoleLabel, isAdminRole } from "@/lib/admin/roles";
import { Mail, ShieldCheck, UserCog } from "lucide-react";
import Link from "next/link";

type MypageSummaryState = "loading" | "error" | "ready";

type Props = {
  user: { id: string; name: string; email: string; role: string; oauthProviders?: Array<"kakao" | "naver"> };
  todoCount: number;
  summaryState: MypageSummaryState;
};

export default function MypageDashboardHero({ user, todoCount, summaryState }: Props) {
  const normalizedRole = String(user.role ?? "").toLowerCase();
  const isAdmin = isAdminRole(normalizedRole);
  const socialProviders = user.oauthProviders ?? [];
  const hasKakao = socialProviders.includes("kakao");
  const hasNaver = socialProviders.includes("naver");
  const hasTodoItems = summaryState === "ready" && todoCount > 0;
  const isSummaryReady = summaryState === "ready";
  const todoMessage = summaryState === "loading"
    ? "요약 정보를 불러오는 중입니다"
    : summaryState === "error"
      ? "요약 정보를 불러오지 못했습니다"
      : hasTodoItems
        ? "오늘 확인할 항목"
        : "현재 처리할 일이 없습니다";
  const todoBadgeVariant: "warning" | "success" | "secondary" | "danger" = summaryState === "error"
    ? "danger"
    : summaryState === "loading"
      ? "secondary"
      : hasTodoItems
        ? "warning"
        : "success";
  const todoBadgeLabel = summaryState === "loading"
    ? "불러오는 중"
    : summaryState === "error"
      ? "불러오기 실패"
      : hasTodoItems
        ? "확인 필요"
        : "완료";
  const todoCtaLabel = hasTodoItems
    ? "확인할 항목 보기"
    : isSummaryReady
      ? "거래 전체 보기"
      : "거래 내역 보기";

  return (
    <section
      className="overflow-hidden rounded-hero border border-surface-inverse-foreground/15 bg-surface-inverse p-5 text-surface-inverse-foreground shadow-soft bp-sm:p-6 bp-lg:p-8"
      aria-labelledby="mypage-dashboard-hero-title"
    >
      <div className="grid gap-5 bp-lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] bp-lg:items-end">
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="text-ui-kicker text-surface-inverse-muted">MY TENNIS LAB</span>
            <span className="h-1.5 w-1.5 rounded-full bg-brand-highlight" aria-hidden="true" />
            <Badge variant="signal_solid">Dashboard</Badge>
          </div>

          <h1
            id="mypage-dashboard-hero-title"
            className="break-keep font-brand-heading text-[1.65rem] leading-tight tracking-[-0.015em] bp-sm:text-[2rem] bp-lg:text-[2.35rem]"
          >
            {user.name ?? "회원"}님, 오늘의 관리 흐름을 확인하세요.
          </h1>

          <div className="mt-3 flex min-w-0 items-center gap-1.5 text-ui-body-sm text-surface-inverse-muted">
            <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-all">{user.email || "이메일 없음"}</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant={isAdmin ? "info" : "secondary"} wrap="normal" className="min-h-6 gap-1 px-2 text-ui-label font-medium">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {isAdmin ? `${getUserRoleLabel(normalizedRole)} 계정` : "사용자 회원"}
            </Badge>
            {hasKakao ? <Badge variant={getSocialProviderBadgeSpec("kakao").variant} wrap="normal" className="min-h-6 px-2 text-ui-label font-medium">카카오 로그인</Badge> : null}
            {hasNaver ? <Badge variant={getSocialProviderBadgeSpec("naver").variant} wrap="normal" className="min-h-6 px-2 text-ui-label font-medium">네이버 로그인</Badge> : null}
            {!hasKakao && !hasNaver ? <Badge variant="secondary" wrap="normal" className="min-h-6 px-2 text-ui-label font-medium">이메일 계정</Badge> : null}
          </div>
        </div>

        <div className="rounded-panel border border-surface-inverse-foreground/15 bg-surface-inverse-muted/10 p-4 bp-sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-ui-kicker text-surface-inverse-muted">TODAY ACTION</p>
              <p className="mt-2 text-ui-body-sm text-surface-inverse-muted">
                {todoMessage}
              </p>
            </div>
            <Badge variant={todoBadgeVariant}>{todoBadgeLabel}</Badge>
          </div>
          <p className="mt-2 font-brand-display text-[2.75rem] leading-none text-brand-highlight bp-sm:text-[3.25rem]">
            {isSummaryReady ? todoCount : "-"}
          </p>
          <div className="mt-4 grid gap-2 bp-sm:grid-cols-2 bp-lg:grid-cols-1">
            <Button asChild variant={hasTodoItems ? "highlight" : "outline"} className="min-h-11 rounded-control">
              <Link href={hasTodoItems ? "/mypage?tab=orders&scope=todo" : "/mypage?tab=orders"}>
                {todoCtaLabel}
              </Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11 rounded-control border-surface-inverse-foreground/25 bg-transparent text-surface-inverse-foreground hover:bg-surface-inverse-muted/15 hover:text-surface-inverse-foreground">
              <Link href="/mypage/profile"><UserCog className="h-4 w-4" aria-hidden="true" />회원정보 수정</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
