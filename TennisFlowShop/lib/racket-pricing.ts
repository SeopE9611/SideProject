type RacketLike = Record<string, unknown> | null | undefined;

type RacketMarketingLike = {
  isSale?: unknown;
  salePrice?: unknown;
};

function getRacketMarketing(racket: RacketLike): RacketMarketingLike | null {
  const marketing = racket?.marketing;
  return marketing && typeof marketing === "object"
    ? (marketing as RacketMarketingLike)
    : null;
}

export function getEffectiveRacketPrice(racket: RacketLike) {
  const marketing = getRacketMarketing(racket);
  const regularPrice = Number(racket?.price ?? 0);
  const salePrice = Number(marketing?.salePrice ?? 0);
  const isSale =
    marketing?.isSale === true &&
    Number.isFinite(regularPrice) &&
    Number.isFinite(salePrice) &&
    salePrice > 0 &&
    salePrice < regularPrice;

  return isSale ? salePrice : regularPrice;
}

export function getRacketDiscountRate(racket: RacketLike) {
  const regularPrice = Number(racket?.price ?? 0);
  const effectivePrice = getEffectiveRacketPrice(racket);
  if (!Number.isFinite(regularPrice) || regularPrice <= 0 || effectivePrice >= regularPrice) return 0;
  return Math.round(((regularPrice - effectivePrice) / regularPrice) * 100);
}

export function hasEffectiveRacketSale(racket: RacketLike) {
  return getRacketDiscountRate(racket) > 0;
}
