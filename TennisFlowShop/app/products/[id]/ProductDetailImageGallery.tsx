import { Badge } from "@/components/ui/badge";
import { CommerceMediaGallery } from "@/components/commerce/detail";
import { merchandisingImageBadgeClass, merchandisingImageBadgeVariant } from "@/lib/badge-style";
import { cn } from "@/lib/utils";
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
        <Badge
          key={`${productName}-${badge}`}
          variant={merchandisingImageBadgeVariant(badge)}
          shape="pill"
          className={cn(merchandisingImageBadgeClass)}
        >
          {badge}
        </Badge>
      ))}
    />
  );
}
