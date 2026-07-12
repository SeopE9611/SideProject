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
      <div className="rounded-panel border border-border bg-card p-3 shadow-soft">
        <div className="flex flex-col gap-2">
          {fallbackItems.map((item, index) => {
            const type = item.type;
            const label = TYPE_LABELS[type];
            const displayName = item.name?.trim() || fallbackName(type);
            return (
              <div key={`${type}-${item.id ?? index}`} className="flex min-w-0 flex-col">
                <article className="flex min-w-0 gap-3 rounded-control border border-border bg-background p-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted bp-lg:h-14 bp-lg:w-14">
                    {item.imageUrl ? (
                      <NextImage src={item.imageUrl} alt={displayName} fill sizes="64px" className="object-cover" />
                    ) : (
                      <div aria-hidden="true" className="grid h-full w-full place-items-center text-ui-label font-semibold text-muted-foreground">
                        {label.slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-ui-caption font-medium text-muted-foreground">{label}</p>
                    <p className="mt-0.5 line-clamp-2 break-words text-ui-body-sm font-semibold text-foreground">{displayName}</p>
                    {item.optionLabel && <p className="mt-1 line-clamp-2 break-words text-ui-label text-muted-foreground">{item.optionLabel}</p>}
                  </div>
                </article>
                {index < fallbackItems.length - 1 ? <div aria-hidden="true" className="flex h-5 items-center justify-center text-muted-foreground">↓</div> : null}
              </div>
            );
          })}
        </div>
        {fallbackItems.some((item) => shortId(item.id)) && (
          <details className="mt-3 rounded-control border border-border bg-muted/30 px-3 py-2 text-ui-label text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">상세 정보</summary>
            <p className="mt-2">지원 문의 시 대상을 확인하기 위한 보조 정보입니다.</p>
            <ul className="mt-2 space-y-1">
              {fallbackItems.map((item, index) => {
                const idSuffix = shortId(item.id);
                return idSuffix ? <li key={`${item.type}-id-${item.id ?? index}`}>{TYPE_LABELS[item.type]} 식별번호 끝 {idSuffix}</li> : null;
              })}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}
