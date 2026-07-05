"use client";

import {
  getPackagePricingMeta,
  type PackageCardData,
} from "@/app/services/packages/_lib/packageCard";
import {
  PACKAGE_VARIANT_BUTTON_CLASS,
  PACKAGE_VARIANT_DOT_CLASS,
  PACKAGE_VARIANT_ICON_CLASS,
  PACKAGE_VARIANT_TOP_BAR_CLASS,
} from "@/app/services/packages/_lib/packageVariant";
import { PriceSummary, PublicSurface } from "@/components/public";
import { Award, CheckCircle, Gift, Package, Star, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const iconByVariant = {
  primary: Target,
  accent: Star,
  muted: Award,
  success: Trophy,
} as const;

interface UnifiedPackageCardProps {
  pkg: PackageCardData;
  selected?: boolean;
  onSelect?: () => void;
  ctaHref?: string;
  ctaLabel?: string;
  ctaDisabled?: boolean;
  ctaHelperText?: string;
  showTotalPrice?: boolean;
  className?: string;
}

export default function UnifiedPackageCard({
  pkg,
  selected = false,
  onSelect,
  ctaHref,
  ctaLabel,
  ctaDisabled,
  ctaHelperText,
  showTotalPrice,
  className,
}: UnifiedPackageCardProps) {
  const Icon = iconByVariant[pkg.variant] ?? Target;
  const pricingMeta = getPackagePricingMeta(pkg);

  return (
    <PublicSurface
      padding="none"
      className={`group relative flex h-full min-w-0 flex-col overflow-hidden transition-[box-shadow,border-color,background-color] duration-200 ${onSelect ? "cursor-pointer hover:shadow-md" : ""} ${selected ? "border-primary/40" : ""} ${className ?? ""}`}
      onClick={onSelect}
    >
      <div className={`h-1.5 ${PACKAGE_VARIANT_TOP_BAR_CLASS[pkg.variant]}`} />

      <div className="p-5 pb-4 text-left sm:p-6 sm:pb-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${PACKAGE_VARIANT_ICON_CLASS[pkg.variant]}`}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {pkg.popular && (
              <Badge variant="brand" className="whitespace-nowrap">
                추천
              </Badge>
            )}
            {pricingMeta.discountRate > 0 && (
              <Badge variant="outline" className="whitespace-nowrap">
                {pricingMeta.discountRate.toFixed(1)}% 할인
              </Badge>
            )}
          </div>
        </div>
        <div className="mb-5 flex min-h-[94px] flex-col justify-start">
          <h3 className="line-clamp-2 text-ui-section-title font-semibold leading-tight break-keep text-balance bp-xl:text-ui-section-title-lg">
            {pkg.title}
          </h3>
          <p className="mt-2 line-clamp-3 min-h-[66px] text-ui-body-sm break-keep leading-relaxed text-muted-foreground">
            {pkg.description}
          </p>
        </div>

        <PriceSummary
          className="rounded-xl border border-border bg-muted/20 p-4"
          rows={[
            {
              id: "sessions",
              label: "이용 횟수",
              value: `${pkg.sessions}회`,
            },
            {
              id: "per-session",
              label: "회당 단가",
              value: `약 ${pricingMeta.perSession.toLocaleString()}원`,
              ...(pricingMeta.originalPerSession > 0
                ? {
                    description: `정가 회당 ${pricingMeta.originalPerSession.toLocaleString()}원`,
                  }
                : {}),
            },
            ...(pricingMeta.savingAmount > 0
              ? [
                  {
                    id: "saving",
                    label: "절감액",
                    value: `${pricingMeta.savingAmount.toLocaleString()}원`,
                    ...(pricingMeta.discountRate > 0
                      ? {
                          description: `${pricingMeta.discountRate.toFixed(1)}% 할인`,
                        }
                      : {}),
                  },
                ]
              : []),
            {
              id: "total",
              label: "총 패키지 금액",
              value: `${pkg.price.toLocaleString()}원`,
              ...(pkg.originalPrice && pkg.originalPrice > pkg.price
                ? {
                    description: `정가 ${pkg.originalPrice.toLocaleString()}원`,
                  }
                : {}),
              emphasis: true,
            },
          ]}
        />
      </div>

      <div className="flex flex-1 flex-col space-y-5 p-5 pt-0 sm:p-6 sm:pt-0">
        <div
          className={`grid gap-3 ${showTotalPrice ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2"}`}
        >
          <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
            <div className="text-ui-section-title font-semibold text-foreground">
              {pkg.sessions}회
            </div>
            <div className="text-ui-body-sm text-muted-foreground">이용 회차</div>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
            <div className="text-ui-section-title font-semibold text-foreground">
              {pkg.validityPeriod}
            </div>
            <div className="text-ui-body-sm text-muted-foreground">유효기간</div>
          </div>
          {showTotalPrice && (
            <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
              <div className="text-ui-section-title font-semibold text-foreground">
                {pkg.price.toLocaleString()}원
              </div>
              <div className="text-ui-body-sm text-muted-foreground">총 금액</div>
            </div>
          )}
        </div>

        <div className="min-h-[148px] rounded-xl border border-border bg-muted/20 p-4">
          <h4 className="mb-3 flex items-center font-semibold">
            <CheckCircle className="mr-2 h-4 w-4 text-success" />
            포함 서비스
          </h4>
          <ul className="space-y-2">
            {pkg.features.slice(0, 4).map((feature, idx) => (
              <li
                key={`${pkg.id}-feature-${idx}`}
                className="flex items-start break-keep text-ui-body-sm leading-relaxed"
              >
                <div
                  className={`mr-3 mt-2 h-2 w-2 flex-shrink-0 rounded-full ${PACKAGE_VARIANT_DOT_CLASS[pkg.variant]}`}
                />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-4 text-foreground">
          <h4 className="mb-3 flex items-center font-semibold text-foreground">
            <Gift className="mr-2 h-4 w-4 text-muted-foreground" />
            혜택 요약
          </h4>
          <div className="space-y-1 text-ui-body-sm text-muted-foreground">
            {pkg.benefits.slice(0, 4).map((benefit, idx) => (
              <div key={`${pkg.id}-benefit-${idx}`}>• {benefit}</div>
            ))}
          </div>
        </div>

        {ctaHref && ctaLabel && (
          <div className="mt-auto space-y-2">
            <Button
              className={`w-full border border-border shadow-sm transition-[box-shadow,border-color,background-color] hover:shadow-md ${PACKAGE_VARIANT_BUTTON_CLASS[pkg.variant]}`}
              asChild
              disabled={ctaDisabled}
            >
              <Link
                href={ctaDisabled ? "#" : ctaHref}
                aria-disabled={ctaDisabled}
                onClick={(e) => {
                  if (!ctaDisabled) return;
                  e.preventDefault();
                }}
              >
                <Package className="mr-2 h-4 w-4" />
                {ctaLabel}
              </Link>
            </Button>
            {ctaHelperText ? (
              <p className="text-center text-ui-body-sm text-muted-foreground">{ctaHelperText}</p>
            ) : null}
          </div>
        )}
      </div>
    </PublicSurface>
  );
}
