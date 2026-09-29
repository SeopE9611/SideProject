import type { ComponentProps, ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  badgeVariantForTone,
  type BadgeEmphasis,
  type BadgeSemanticTone,
  type BadgeShape,
  type BadgeSize,
} from "@/lib/badge-style";

type LegacyBadgeVariant = ComponentProps<typeof Badge>["variant"];

type SemanticBadgeProps = Omit<ComponentProps<typeof Badge>, "variant" | "size" | "shape" | "wrap"> & {
  tone?: BadgeSemanticTone;
  /** 기존 화면을 점진적으로 의미 기반 V2로 옮길 때 사용하는 호환 입력입니다. */
  variant?: LegacyBadgeVariant;
  emphasis?: BadgeEmphasis;
  size?: BadgeSize;
  shape?: BadgeShape;
  wrap?: "nowrap" | "normal";
  className?: string;
  children: ReactNode;
};

export function SemanticBadge({
  tone,
  variant,
  emphasis = "soft",
  size = "sm",
  shape = "rounded",
  wrap = "nowrap",
  className,
  children,
  ...props
}: SemanticBadgeProps) {
  const resolvedVariant = tone ? badgeVariantForTone(tone, emphasis) : variant;

  return (
    <Badge
      variant={resolvedVariant}
      size={size}
      shape={shape}
      wrap={wrap}
      className={className}
      {...props}
    >
      {children}
    </Badge>
  );
}
