import { SemanticBadge } from "@/components/badges/SemanticBadge";
import {
  commerceBadgeSpec,
  type BadgeSize,
  type BadgeSurface,
  type CommerceBadgeKind,
} from "@/lib/badge-style";

type CommerceBadgeProps = {
  kind: CommerceBadgeKind;
  surface: BadgeSurface;
  discountRate?: number;
  size?: BadgeSize;
  className?: string;
};

export function CommerceBadge({
  kind,
  surface,
  discountRate,
  size,
  className,
}: CommerceBadgeProps) {
  const spec = commerceBadgeSpec(kind, surface, discountRate);

  return (
    <SemanticBadge
      tone={spec.tone}
      emphasis={spec.emphasis}
      size={size ?? spec.size}
      shape="pill"
      className={className}
    >
      {spec.label}
    </SemanticBadge>
  );
}
