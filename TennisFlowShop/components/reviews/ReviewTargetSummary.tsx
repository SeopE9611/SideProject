import type { CanonicalReviewTarget } from "@/lib/reviews/review-target";
import { getReviewContextLabel } from "@/lib/reviews/review-target";
import NextImage from "next/image";

const TYPE_LABELS: Record<NonNullable<CanonicalReviewTarget["relatedItems"]>[number]["type"], string> = {
  product: "상품",
  racket: "라켓",
  string: "스트링",
  service: "교체서비스",
  rental: "대여",
};

function shortId(value?: string | null) {
  const id = String(value ?? "").trim();
  return id ? id.slice(-6) : null;
}

function fallbackName(type: keyof typeof TYPE_LABELS) {
  return type === "service" ? "교체서비스" : `${TYPE_LABELS[type]} 대상`;
}

export default function ReviewTargetSummary({ target }: { target: CanonicalReviewTarget }) {
  const relatedItems = target.relatedItems ?? [];
  const fallbackItems = relatedItems.length
    ? relatedItems
    : ([
        target.primaryProductId ? { type: "product" as const, id: target.primaryProductId, name: "상품 후기 대상" } : null,
        target.primaryRacketId ? { type: "racket" as const, id: target.primaryRacketId, name: "라켓 후기 대상" } : null,
        target.primaryApplicationId ? { type: "service" as const, id: target.primaryApplicationId, name: "교체서비스" } : null,
        target.rentalId ? { type: "rental" as const, id: target.rentalId, name: "대여 후기 대상" } : null,
      ].filter(Boolean) as NonNullable<CanonicalReviewTarget["relatedItems"]>);

  return (
    <section aria-labelledby="review-target-summary-title" className="space-y-3">
      <div>
        <h3 id="review-target-summary-title" className="text-ui-body-sm font-semibold text-foreground">
          {getReviewContextLabel(target.reviewContext)} 대상
        </h3>
        <p className="mt-1 text-ui-label text-muted-foreground">
          {target.reviewContext === "product_stringing"
            ? "상품과 교체서비스 경험을 하나의 후기로 남겨주세요."
            : target.reviewContext === "rental_stringing"
              ? "대여와 스트링 교체 경험을 하나의 후기로 남겨주세요."
              : "아래 대상으로 후기가 등록됩니다."}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {fallbackItems.map((item, index) => {
          const type = item.type;
          const label = TYPE_LABELS[type];
          const displayName = item.name?.trim() || fallbackName(type);
          const idSuffix = shortId(item.id);
          return (
            <article key={`${type}-${item.id ?? index}`} className="flex min-w-0 gap-3 rounded-2xl border border-border bg-muted/30 p-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
                {item.imageUrl ? (
                  <NextImage src={item.imageUrl} alt={displayName} fill sizes="56px" className="object-cover" />
                ) : (
                  <div aria-hidden="true" className="grid h-full w-full place-items-center text-ui-label font-semibold text-muted-foreground">
                    {label.slice(0, 2)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-ui-caption font-medium text-muted-foreground">{label}</p>
                <p className="mt-0.5 line-clamp-2 break-words text-ui-body-sm font-medium text-foreground">{displayName}</p>
                {item.optionLabel && <p className="mt-1 line-clamp-2 break-words text-ui-label text-muted-foreground">{item.optionLabel}</p>}
                {idSuffix && <p className="mt-1 text-ui-caption text-muted-foreground">식별번호 끝 {idSuffix}</p>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
