import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  merchandisingImageBadgeClass,
  merchandisingImageBadgeVariant,
} from "@/lib/badge-style";
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
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const nextImage = () => {
    if (images.length === 0) return;
    setSelectedImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    if (images.length === 0) return;
    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const mainImage = currentImage || images[selectedImageIndex] || "/placeholder.svg";

  return (
    <div className="space-y-4 self-start sm:space-y-5 bp-lg:sticky bp-lg:top-[calc(var(--header-h)+24px)] bp-lg:col-span-3">
      <Card className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
        <div className="relative aspect-square bg-muted/20">
          <Image
            src={mainImage}
            alt={productName}
            fill
            className="object-contain p-4 transition-transform duration-300 hover:scale-[1.02]"
          />
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-3 top-1/2 h-10 w-10 -translate-y-1/2 rounded-xl border border-border/60 bg-card/90 text-foreground shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] duration-200 hover:bg-card sm:h-11 sm:w-11"
                onClick={prevImage}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-1/2 h-10 w-10 -translate-y-1/2 rounded-xl border border-border/60 bg-card/90 text-foreground shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] duration-200 hover:bg-card sm:h-11 sm:w-11"
                onClick={nextImage}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}
          {merchandisingBadges.length > 0 && (
            <div className="absolute top-4 sm:top-5 left-4 sm:left-5 flex flex-wrap gap-2 sm:gap-2.5">
              {merchandisingBadges.map((badge) => (
                <Badge
                  key={`${productName}-${badge}`}
                  variant={merchandisingImageBadgeVariant(badge)}
                  shape="pill"
                  className={cn(merchandisingImageBadgeClass)}
                >
                  {badge}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>

      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {images.map((image: string, index: number) => (
            <Card
              key={index}
              className={`cursor-pointer overflow-hidden rounded-xl border transition-[border-color,box-shadow] duration-200 ${selectedImageIndex === index ? "border-foreground ring-2 ring-ring/30" : "border-border/60 hover:border-border"}`}
              onClick={() => setSelectedImageIndex(index)}
            >
              <div className="aspect-square relative bg-muted/20">
                <Image
                  src={
                    image || "/placeholder.svg?height=100&width=100&query=tennis string thumbnail"
                  }
                  alt={`${productName} ${index + 1}`}
                  fill
                  className="object-contain p-2"
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
