import { SemanticBadge } from "@/components/badges/SemanticBadge";
import { CommerceMediaGallery } from "@/components/commerce/detail";
import type { ProductBadge } from "./ProductDetailClient.types";

type ProductDetailImageGalleryProps = {
  images: string[];
  productName: string;
  currentImage?: string;
  merchandisingBadges: ProductBadge[];
};

export default function ProductDetailImageGallery({
  images,
  productName,
  currentImage,
  merchandisingBadges,
}: ProductDetailImageGalleryProps) {
  return (
    <CommerceMediaGallery
      images={images}
      alt={productName}
      overrideImage={currentImage}
      objectFit="contain"
      badges={merchandisingBadges.map((badge) => (
        <SemanticBadge key={`${productName}-${badge.label}`} {...badge}>
          {badge.label}
        </SemanticBadge>
      ))}
    />
  );
}
