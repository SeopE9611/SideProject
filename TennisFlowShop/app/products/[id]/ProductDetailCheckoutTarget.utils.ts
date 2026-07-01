type ProductDetailBuyNowWithServiceCheckoutTargetParams = {
  mountingFee: number;
};

export function getProductDetailBuyNowCheckoutTarget() {
  return "/checkout?mode=buynow";
}

export function getProductDetailBuyNowWithServiceCheckoutTarget({
  mountingFee,
}: ProductDetailBuyNowWithServiceCheckoutTargetParams) {
  const search = new URLSearchParams({
    mode: "buynow",
    withService: "1",
    mountingFee: String(mountingFee),
  });

  return `/checkout?${search.toString()}`;
}
