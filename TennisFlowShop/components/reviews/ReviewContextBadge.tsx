import { SemanticBadge } from "@/components/badges/SemanticBadge";
import { getReviewContextLabel, type ReviewContext } from "@/lib/reviews/review-target";

type ReviewContextBadgeProps = {
  reviewContext?: ReviewContext | null;
  contextLabel?: string | null;
};

export default function ReviewContextBadge({
  reviewContext,
  contextLabel,
}: ReviewContextBadgeProps) {
  const label = contextLabel || getReviewContextLabel(reviewContext);
  return (
    <SemanticBadge tone="neutral" emphasis="outline">
      {label}
    </SemanticBadge>
  );
}
