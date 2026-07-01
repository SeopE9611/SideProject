import type { CartItem } from "@/app/store/cartStore";
import { getProductPriceDisplayMeta } from "@/lib/product-pricing";
import type { ColorInventoryRow } from "./ProductDetailClient.types";

type BuildProductDetailCartItemParams = {
  product: any;
  displayPrice: number;
  quantity: number;
  effectiveStock: number;
  selectedGauge: string;
  selectedColorRow?: ColorInventoryRow;
  selectedColorPayload: Record<string, unknown>;
};

export function buildProductDetailCartItem({
  product,
  displayPrice,
  quantity,
  effectiveStock,
  selectedGauge,
  selectedColorRow,
  selectedColorPayload,
}: BuildProductDetailCartItemParams): CartItem {
  return {
    id: product._id.toString(),
    name: product.name,
    price: displayPrice,
    ...getProductPriceDisplayMeta(product),
    quantity,
    image: selectedColorRow?.image?.trim() || product.images?.[0] || "/placeholder.svg",
    stock: effectiveStock,
    selectedGauge: selectedGauge || undefined,
    ...selectedColorPayload,
  };
}
