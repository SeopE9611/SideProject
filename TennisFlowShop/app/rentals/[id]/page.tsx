import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, PackageCheck, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PrimaryCTAGroup } from "@/components/public/PrimaryCTAGroup";
import { racketBrandLabel } from "@/lib/constants";
import { racketConditionLabel } from "@/lib/racket-condition";
import {
  getRacketActiveCountPayload,
  getRacketDetailPayload,
} from "@/lib/racket-detail.server";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "대여 라켓 상세",
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ period?: string }>;
};

function formatPrice(value: unknown) {
  return `${Number(value ?? 0).toLocaleString()}원`;
}

function normalizePeriod(value?: string): 7 | 15 | 30 {
  const raw = Number(value ?? 7);
  return raw === 7 || raw === 15 || raw === 30 ? raw : 7;
}

function getFeeForPeriod(
  fee: { d7?: number; d15?: number; d30?: number } | undefined,
  period: 7 | 15 | 30,
) {
  if (period === 15) return Number(fee?.d15 ?? 0);
  if (period === 30) return Number(fee?.d30 ?? 0);
  return Number(fee?.d7 ?? 0);
}

function SpecRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") return null;

  return (
    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 min-w-0 break-words text-sm font-semibold tabular-nums text-foreground">
        {value}
      </dd>
    </div>
  );
}

export default async function RentalDetailPage({ params, searchParams }: PageProps) {
  const [{ id }, sp] = await Promise.all([params, searchParams ?? Promise.resolve({})]);
  const period = normalizePeriod(sp?.period);

  const [racket, stock] = await Promise.all([
    getRacketDetailPayload(id),
    getRacketActiveCountPayload(id),
  ]);

  if (!racket) notFound();

  const rental = racket.rental as
    | {
        enabled?: boolean;
        deposit?: number;
        fee?: { d7?: number; d15?: number; d30?: number };
        disabledReason?: string;
      }
    | undefined;

  const spec = racket.spec as
    | {
        weight?: number | null;
        balance?: number | null;
        headSize?: number | null;
        pattern?: string | null;
        gripSize?: string | null;
      }
    | undefined;
  const images = Array.isArray(racket.images) ? (racket.images as string[]) : [];
  const image = images[0] ?? null;
  const brand = racketBrandLabel(String(racket.brand ?? "")) || String(racket.brand ?? "");
  const model = String(racket.model ?? "대여 라켓");
  const condition = racketConditionLabel(String(racket.condition ?? ""));
  const fee = getFeeForPeriod(rental?.fee, period);
  const deposit = Number(rental?.deposit ?? 0);
  const available = Number(stock.available ?? 0);
  const quantity = Number(stock.quantity ?? 0);
  const isSold = quantity <= 0;
  const canRent = Boolean(rental?.enabled) && !isSold && available > 0;
  const disabledReason = rental?.enabled
    ? isSold
      ? "대여 가능한 라켓이 없습니다."
      : available <= 0
        ? "현재 전량 대여중입니다."
        : undefined
    : rental?.disabledReason || "대여 불가 상태입니다.";
  const selectStringHref = `/rentals/${encodeURIComponent(id)}/select-string?period=${period}`;
  const checkoutHref = `/rentals/${encodeURIComponent(id)}/checkout?period=${period}`;

  const statusBadge = canRent ? (
    <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary">
      대여 가능 · {available}/{quantity}
    </Badge>
  ) : (
    <Badge variant="outline" className="rounded-full border-border bg-muted/30 text-muted-foreground">
      {disabledReason}
    </Badge>
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-5">
        <Button asChild variant="ghost" size="sm" className="px-0 text-muted-foreground hover:bg-transparent">
          <Link href="/rackets">
            <ArrowLeft className="h-4 w-4" />
            라켓 목록으로
          </Link>
        </Button>
      </div>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <Card className="overflow-hidden rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="grid gap-5 p-4 sm:p-5 md:grid-cols-[minmax(220px,0.9fr)_minmax(0,1.1fr)]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-muted/20">
              {image ? (
                <Image src={image} alt={`${brand} ${model}`} fill className="object-contain p-4" sizes="(min-width: 1024px) 420px, 100vw" priority />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">이미지 준비중</div>
              )}
            </div>

            <div className="min-w-0 space-y-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full">대여 라켓</Badge>
                  {statusBadge}
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{brand}</p>
                  <h1 className="break-keep text-2xl font-bold leading-tight text-foreground sm:text-3xl">{model}</h1>
                  <p className="break-keep text-sm leading-relaxed text-muted-foreground">대여 가능한 라켓입니다. 기간과 보증금을 확인한 뒤 스트링 선택 또는 대여 신청 단계로 이동하세요.</p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <SpecRow label="상태" value={condition} />
                <SpecRow label="무게" value={spec?.weight ? `${spec.weight}g` : null} />
                <SpecRow label="헤드사이즈" value={spec?.headSize ? `${spec.headSize}sq.in` : null} />
                <SpecRow label="밸런스" value={spec?.balance ? `${spec.balance}mm` : null} />
                <SpecRow label="패턴" value={spec?.pattern} />
                <SpecRow label="그립" value={spec?.gripSize} />
              </dl>
            </div>
          </CardContent>
        </Card>

        <aside className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 lg:sticky lg:top-24">
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">대여 조건</p>
              <h2 className="mt-1 text-xl font-bold text-foreground">비용과 기간 확인</h2>
            </div>

            <dl className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-muted-foreground">대여료</dt>
                <dd className="whitespace-nowrap text-base font-bold tabular-nums text-foreground">{formatPrice(fee)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-muted-foreground">보증금</dt>
                <dd className="whitespace-nowrap text-base font-bold tabular-nums text-foreground">{formatPrice(deposit)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-sm text-muted-foreground">대여 기간</dt>
                <dd className="whitespace-nowrap text-base font-bold tabular-nums text-foreground">{period}일</dd>
              </div>
            </dl>

            <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm leading-relaxed text-muted-foreground">
              <div className="flex gap-2">
                <PackageCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="break-keep">스트링을 선택하면 대여 신청 단계에서 수령 정보와 최종 금액을 다시 확인합니다.</p>
              </div>
              <div className="mt-3 flex gap-2">
                <RotateCcw className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="break-keep">보증금은 반납 확인 후 환급되는 금액으로 대여료와 별도로 표시됩니다.</p>
              </div>
              <div className="mt-3 flex gap-2">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="break-keep">현재 선택된 대여 기간은 {period}일입니다.</p>
              </div>
            </div>

            <PrimaryCTAGroup
              className="sm:w-full sm:flex-col"
              primary={
                canRent ? (
                  <Button asChild size="tall" wrap="responsive" className="w-full">
                    <Link href={selectStringHref}>스트링 선택하고 대여 신청</Link>
                  </Button>
                ) : (
                  <Button size="tall" wrap="responsive" className="w-full" disabled title={disabledReason}>
                    대여 신청 불가
                  </Button>
                )
              }
              secondary={
                canRent ? (
                  <Button asChild variant="outline" size="tall" wrap="responsive" className="w-full">
                    <Link href={checkoutHref}>스트링 없이 대여 신청</Link>
                  </Button>
                ) : null
              }
            />
          </div>
        </aside>
      </section>
    </main>
  );
}
