type ProductDetailLoginRedirectTargetParams = {
  nextPath: string;
};

export function getProductDetailLoginRedirectTarget({
  nextPath,
}: ProductDetailLoginRedirectTargetParams) {
  return `/login?next=${encodeURIComponent(nextPath)}`;
}
