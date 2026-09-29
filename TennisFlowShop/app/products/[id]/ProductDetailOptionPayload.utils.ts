import type { ColorInventoryRow, VariantInventoryRow } from "./ProductDetailClient.types";

type SelectedColorPayloadParams = {
  selectedColor: string;
  selectedColorRow?: ColorInventoryRow;
  selectedVariant?: VariantInventoryRow;
  colorImage?: string;
  productImages?: string[];
  getColorLabel: (row: ColorInventoryRow) => string;
};

export function buildSelectedColorPayload({
  selectedColor,
  selectedColorRow,
  selectedVariant,
  colorImage,
  productImages,
  getColorLabel,
}: SelectedColorPayloadParams) {
  return selectedColorRow && selectedColor
    ? {
        selectedColor,
        selectedColorLabel: getColorLabel(selectedColorRow),
        selectedColorHex: selectedColorRow.colorHex,
        selectedColorImage:
          selectedVariant?.colorImage?.trim() ||
          selectedColorRow.image ||
          colorImage ||
          productImages?.[0] ||
          "/placeholder.svg",
      }
    : {};
}

type WishlistOptionPayloadParams = {
  selectedGauge: string;
  selectedColorPayload: Record<string, unknown>;
};

export function buildWishlistOptionPayload({
  selectedGauge,
  selectedColorPayload,
}: WishlistOptionPayloadParams) {
  return {
    selectedGauge: selectedGauge || undefined,
    ...selectedColorPayload,
  };
}

type WishlistOptionStateParams = {
  isWishlisted: boolean;
  currentWishlistItem: any;
  wishlistOptionPayload: {
    selectedGauge?: string;
    selectedColor?: string;
  } & Record<string, unknown>;
};

export function getWishlistOptionState({
  isWishlisted,
  currentWishlistItem,
  wishlistOptionPayload,
}: WishlistOptionStateParams) {
  const hasCurrentWishlistOption = Boolean(
    wishlistOptionPayload.selectedGauge || wishlistOptionPayload.selectedColor,
  );
  const isDifferentWishlistOption =
    currentWishlistItem?.selectedGauge !== wishlistOptionPayload.selectedGauge ||
    currentWishlistItem?.selectedColor !== wishlistOptionPayload.selectedColor;
  const shouldUpdateWishlistOption =
    isWishlisted &&
    hasCurrentWishlistOption &&
    (!currentWishlistItem?.hasSelectedOption || isDifferentWishlistOption);
  const wishlistButtonLabel = shouldUpdateWishlistOption ? "선택 옵션으로 업데이트" : "위시리스트";

  return {
    hasCurrentWishlistOption,
    isDifferentWishlistOption,
    shouldUpdateWishlistOption,
    wishlistButtonLabel,
  };
}
