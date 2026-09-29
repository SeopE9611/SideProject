import { SemanticBadge } from "@/components/badges/SemanticBadge";
import {
  racketAvailabilityBadgeSpec,
  racketConditionBadgeSpec,
  racketInspectionBadgeSpec,
  type BadgeSize,
  type BadgeSurface,
  type RacketAvailabilityState,
} from "@/lib/badge-style";

type RacketBadgeBaseProps = { surface?: BadgeSurface; size?: BadgeSize; className?: string };

type RacketBadgeProps =
  | (RacketBadgeBaseProps & { kind: "condition"; state: string })
  | (RacketBadgeBaseProps & { kind: "availability"; state: RacketAvailabilityState })
  | (RacketBadgeBaseProps & { kind: "inspection"; state?: never });

export function RacketBadge(props: RacketBadgeProps) {
  const surface = props.surface ?? "inline";
  const spec =
    props.kind === "condition"
      ? racketConditionBadgeSpec(props.state, surface)
      : props.kind === "availability"
        ? racketAvailabilityBadgeSpec(props.state, surface)
        : racketInspectionBadgeSpec(surface);

  return (
    <SemanticBadge
      tone={spec.tone}
      emphasis={spec.emphasis}
      size={props.size ?? spec.size}
      shape={spec.shape}
      className={props.className}
    >
      {spec.label}
    </SemanticBadge>
  );
}
