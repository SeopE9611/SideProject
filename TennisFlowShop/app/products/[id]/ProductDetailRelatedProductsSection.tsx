import type { ComponentType, ReactNode, RefObject } from "react";

import type { HItem } from "@/components/HorizontalProducts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProductDetailRelatedProductsSectionProps = {
  HorizontalProducts: ComponentType<any>;
  relatedSectionRef: RefObject<HTMLDivElement | null>;
  relatedProducts: HItem[];
  loadingRelated: boolean;
  children?: ReactNode;
};

export default function ProductDetailRelatedProductsSection({
  HorizontalProducts,
  relatedSectionRef,
  relatedProducts,
  loadingRelated,
  children,
}: ProductDetailRelatedProductsSectionProps) {
  return (
    <div ref={relatedSectionRef} className="mt-8 space-y-6 sm:mt-12 sm:space-y-8">
      <Card className="rounded-2xl border border-border bg-card shadow-sm sm:rounded-3xl">
        <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-4">
          <CardTitle className="break-keep text-ui-card-title-lg font-semibold leading-snug sm:text-ui-section-title">
            관련 상품
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <HorizontalProducts
            title="관련 상품"
            items={relatedProducts}
            moreHref="/products"
            showHeader={false}
            showMoreCard={false}
            loading={loadingRelated}
            emptyTitle="관련 상품이 없습니다"
            emptyDescription="다른 스트링도 둘러보세요."
          />
        </CardContent>
      </Card>
      {children}
    </div>
  );
}
