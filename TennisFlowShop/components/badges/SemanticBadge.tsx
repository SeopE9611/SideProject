import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  badgeVariantForTone,
  type BadgeEmphasis,
  type BadgeSemanticTone,
  type BadgeShape,
  type BadgeSize,
} from "@/lib/badge-style";

type SemanticBadgeProps = {
  tone: BadgeSemanticTone;
  emphasis?: BadgeEmphasis;
  size?: BadgeSize;
  shape?: BadgeShape;
  wrap?: "nowrap" | "normal";
  className?: string;
  children: ReactNode;
};

export function SemanticBadge({
  tone,
  emphasis = "soft",
  size = "sm",
  shape = "rounded",
  wrap = "nowrap",
  className,
  children,
}: SemanticBadgeProps) {
  return (
    <Badge
      variant={badgeVariantForTone(tone, emphasis)}
      size={size}
      shape={shape}
      wrap={wrap}
      className={className}
    >
      {children}
    </Badge>
  );
}
