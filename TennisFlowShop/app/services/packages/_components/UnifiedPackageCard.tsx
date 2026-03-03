'use client';

import type { PackageCardData } from '@/app/services/packages/_lib/packageCard';
import {
  PACKAGE_VARIANT_BUTTON_CLASS,
  PACKAGE_VARIANT_DOT_CLASS,
  PACKAGE_VARIANT_ICON_CLASS,
  PACKAGE_VARIANT_TOP_BAR_CLASS,
} from '@/app/services/packages/_lib/packageVariant';
import { getMerchandisingBadgeSpec } from '@/lib/badge-style';
import { Award, CheckCircle, Gift, Package, Star, Target, Trophy } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

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

  return (
    <Card
      className={`group relative overflow-hidden border-0 shadow-xl transition-all duration-300 ${onSelect ? 'cursor-pointer hover:-translate-y-1 hover:shadow-2xl' : ''} ${pkg.popular || selected ? 'ring-2 ring-ring' : ''} ${className ?? ''}`}
      onClick={onSelect}
    >
      {pkg.popular && <div className="absolute right-0 top-0 rounded-bl-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">인기</div>}
      {pkg.discount && <div className="absolute left-0 top-0 rounded-br-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">{pkg.discount}% 할인</div>}

      <div className={`h-2 ${PACKAGE_VARIANT_TOP_BAR_CLASS[pkg.variant]}`} />

      <CardHeader className="pb-4 text-center">
        <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full shadow-lg ${PACKAGE_VARIANT_ICON_CLASS[pkg.variant]}`}>
          <Icon className="h-8 w-8" />
        </div>
        <div className="mb-2 flex items-center justify-center gap-2">
          <CardTitle className="text-2xl font-bold">{pkg.title}</CardTitle>
          {pkg.popular && <Badge variant={getMerchandisingBadgeSpec('popular').variant}>추천</Badge>}
        </div>
        <CardDescription className="mb-4 text-base">{pkg.description}</CardDescription>

        <div className="space-y-1">
          <div className="text-4xl font-bold text-primary">{pkg.price.toLocaleString()}원</div>
          {pkg.originalPrice && pkg.originalPrice > pkg.price && <div className="text-lg text-muted-foreground line-through">{pkg.originalPrice.toLocaleString()}원</div>}
          <div className="text-sm text-muted-foreground">회당 {Math.round(pkg.price / pkg.sessions).toLocaleString()}원</div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className={`grid gap-3 ${showTotalPrice ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div className="rounded-lg bg-muted p-3 text-center">
            <div className="text-xl font-bold text-foreground">{pkg.sessions}회</div>
            <div className="text-xs text-muted-foreground">이용 회차</div>
          </div>
          <div className="rounded-lg bg-muted p-3 text-center">
            <div className="text-xl font-bold text-foreground">{pkg.validityPeriod}</div>
            <div className="text-xs text-muted-foreground">유효기간</div>
          </div>
          {showTotalPrice && (
            <div className="rounded-lg bg-muted p-3 text-center">
              <div className="text-xl font-bold text-foreground">{pkg.price.toLocaleString()}원</div>
              <div className="text-xs text-muted-foreground">총 금액</div>
            </div>
          )}
        </div>

        <Separator />

        <div>
          <h4 className="mb-3 flex items-center font-semibold">
            <CheckCircle className="mr-2 h-4 w-4 text-success" />
            포함 서비스
          </h4>
          <ul className="space-y-2">
            {pkg.features.map((feature, idx) => (
              <li key={`${pkg.id}-feature-${idx}`} className="flex items-start text-sm">
                <div className={`mr-3 mt-2 h-2 w-2 flex-shrink-0 rounded-full ${PACKAGE_VARIANT_DOT_CLASS[pkg.variant]}`} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-muted p-4 text-foreground">
          <h4 className="mb-3 flex items-center font-semibold text-foreground">
            <Gift className="mr-2 h-4 w-4 text-primary" />
            혜택 요약
          </h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            {pkg.benefits.map((benefit, idx) => (
              <div key={`${pkg.id}-benefit-${idx}`}>• {benefit}</div>
            ))}
          </div>
        </div>

        {ctaHref && ctaLabel && (
          <div className="space-y-2">
            <Button className={`w-full border-0 shadow-lg transition-all hover:shadow-xl ${PACKAGE_VARIANT_BUTTON_CLASS[pkg.variant]}`} asChild disabled={ctaDisabled}>
              <Link
                href={ctaDisabled ? '#' : ctaHref}
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
            {ctaHelperText ? <p className="text-center text-xs text-muted-foreground">{ctaHelperText}</p> : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
