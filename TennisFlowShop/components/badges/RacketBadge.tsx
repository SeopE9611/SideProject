import { SemanticBadge } from "@/components/badges/SemanticBadge";
import {
  racketAvailabilityBadgeSpec,
  racketConditionBadgeSpec,
  racketInspectionBadgeSpec,
  type BadgeSize,
  type RacketAvailabilityState,
} from "@/lib/badge-style";

type RacketBadgeProps =
  | { kind: "condition"; state: string; size?: BadgeSize; className?: string }
  | {
      kind: "availability";
      state: RacketAvailabilityState;
      size?: BadgeSize;
      className?: string;
    }
  | { kind: "inspection"; state?: never; size?: BadgeSize; className?: string };

export function RacketBadge(props: RacketBadgeProps) {
  const spec =
    props.kind === "condition"
      ? racketConditionBadgeSpec(props.state)
      : props.kind === "availability"
        ? racketAvailabilityBadgeSpec(props.state)
        : racketInspectionBadgeSpec();

  return (
    <SemanticBadge
      tone={spec.tone}
      emphasis={spec.emphasis}
      size={props.size ?? spec.size}
      shape="rounded"
      className={props.className}
    >
      {spec.label}
    </SemanticBadge>
  );
}
