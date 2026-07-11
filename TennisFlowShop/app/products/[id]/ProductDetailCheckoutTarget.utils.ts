type ProductDetailBuyNowWithServiceCheckoutTargetParams = {
  mountingFee: number;
  careItemId?: string;
};

export function getProductDetailBuyNowCheckoutTarget() {
  return "/checkout?mode=buynow";
}

export function getProductDetailBuyNowWithServiceCheckoutTarget({
  mountingFee,
  careItemId,
}: ProductDetailBuyNowWithServiceCheckoutTargetParams) {
  const search = new URLSearchParams({
    mode: "buynow",
    withService: "1",
    mountingFee: String(mountingFee),
  });
  if (careItemId) search.set("careItemId", careItemId);

  return `/checkout?${search.toString()}`;
}
