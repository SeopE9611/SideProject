import { Star } from "lucide-react";

export default function ReviewRatingDisplay({ rating }: { rating: number }) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  return (
    <span className="inline-flex items-center gap-2" aria-label={`평점 ${safeRating}점`}>
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={index < safeRating ? "h-4 w-4 fill-current text-warning" : "h-4 w-4 fill-transparent text-muted-foreground"}
          />
        ))}
      </span>
      <span className="text-ui-label font-semibold text-foreground tabular-nums">{safeRating.toFixed(1)}</span>
    </span>
  );
}
