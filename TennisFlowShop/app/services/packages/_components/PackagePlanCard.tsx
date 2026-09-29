"use client";

import {
  getPackagePricingMeta,
  type PackageCardData,
} from "@/app/services/packages/_lib/packageCard";
import { PublicSurface } from "@/components/public";
import { CommerceBadge } from "@/components/badges/CommerceBadge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Lock } from "lucide-react";
import Link from "next/link";

interface PackagePlanCardProps {
  pkg: PackageCardData;
  ctaHref: string;
  blocked?: boolean;
}

export default function PackagePlanCard({ pkg, ctaHref, blocked = false }: PackagePlanCardProps) {
  const pricingMeta = getPackagePricingMeta(pkg);
  const visibleFeatures = pkg.features.slice(0, 3);
  const savingAmountLabel =
    pricingMeta.savingAmount > 0 ? `${pricingMeta.savingAmount.toLocaleString()}원 절감` : null;
  const discountRateLabel =
    pricingMeta.discountRate > 0 ? `${pricingMeta.discountRate.toFixed(1)}% 할인` : null;
  const savingLabel =
    savingAmountLabel && discountRateLabel
      ? `${savingAmountLabel} · ${discountRateLabel}`
      : savingAmountLabel || discountRateLabel || "정가 기준 제공";

  return (
    <PublicSurface
      padding="none"
      className={`flex h-full min-w-0 flex-col overflow-hidden ${
        pkg.popular ? "border-brand-highlight-ink/35 bg-brand-highlight-muted/35" : "bg-card"
      }`}
    >
      <article className="flex flex-1 flex-col p-5 bp-sm:p-6">
        <h3 className="break-keep text-ui-section-title font-semibold leading-tight text-foreground">
          {pkg.title}
        </h3>
        {(pkg.popular || pricingMeta.discountRate > 0) && (
          <div className="mt-3 flex min-w-0 flex-wrap gap-2">
            {pkg.popular && (
              <CommerceBadge kind="recommended" surface="inline" size="md" />
            )}
            {pricingMeta.discountRate > 0 && (
              <CommerceBadge
                kind="sale"
                surface="inline"
                discountRate={pricingMeta.discountRate}
                size="md"
              />
            )}
          </div>
        )}

        {pkg.description && (
          <p className="mt-2 line-clamp-2 break-keep text-ui-body-sm leading-relaxed text-muted-foreground">
            {pkg.description}
          </p>
        )}

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-ui-label font-medium text-muted-foreground">이용 횟수</p>
            <p className="mt-1 tabular-nums text-ui-page-title-lg font-semibold leading-tight text-foreground">
              {pkg.sessions.toLocaleString()}회
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-ui-label font-medium text-muted-foreground">총 패키지 금액</p>
            <p className="tabular-nums text-ui-section-title-lg font-semibold leading-tight text-foreground">
              {pkg.price.toLocaleString()}원
            </p>
            {pkg.originalPrice != null && pkg.originalPrice > pkg.price && (
              <p className="tabular-nums text-ui-label text-muted-foreground line-through">
                정가 {pkg.originalPrice.toLocaleString()}원
              </p>
            )}
            <p className="tabular-nums text-ui-body-sm font-medium text-foreground">
              회당 약 {pricingMeta.perSession.toLocaleString()}원
            </p>
          </div>

          <dl className="divide-y divide-border border-y border-border text-ui-body-sm">
            <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-4 py-3">
              <dt className="text-muted-foreground">혜택</dt>
              <dd className="min-w-0 break-keep text-right font-semibold text-foreground">
                {savingLabel}
              </dd>
            </div>
            <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-4 py-3">
              <dt className="text-muted-foreground">유효기간</dt>
              <dd className="min-w-0 break-keep text-right font-semibold text-foreground">
                {pkg.validityPeriod}
              </dd>
            </div>
          </dl>
        </div>

        {visibleFeatures.length > 0 && (
          <ul className="mt-5 space-y-2 text-ui-body-sm leading-relaxed text-muted-foreground">
            {visibleFeatures.map((feature) => (
              <li key={feature} className="flex min-w-0 gap-2 break-keep">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-highlight-ink" />
                <span className="min-w-0 break-words">{feature}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-6">
          {blocked ? (
            <div className="flex min-h-11 items-center justify-center gap-2 rounded-control border border-border bg-muted/50 px-4 py-2 text-ui-body-sm font-medium text-muted-foreground">
              <Lock className="h-4 w-4 shrink-0" />
              현재 추가 구매 불가
            </div>
          ) : (
            <Button
              variant={pkg.popular ? "highlight_soft" : "outline"}
              className="min-h-11 w-full"
              asChild
            >
              <Link href={ctaHref}>패키지 구매하기</Link>
            </Button>
          )}
        </div>
      </article>
    </PublicSurface>
  );
}
