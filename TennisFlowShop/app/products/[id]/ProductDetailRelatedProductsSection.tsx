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
    <div ref={relatedSectionRef} className="mt-8 bp-md:mt-10">
      <Card className="-mx-3 rounded-none border-x-0 border-y border-border bg-card shadow-none bp-sm:-mx-4 bp-md:mx-0 bp-md:rounded-panel bp-md:border-x bp-md:shadow-sm">
        <CardHeader className="p-4 pb-3 bp-sm:p-5 bp-sm:pb-4 bp-md:p-6 bp-md:pb-5">
          <CardTitle className="break-keep text-ui-card-title-lg font-ui-bold leading-snug bp-sm:text-ui-section-title">
            관련 상품
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 bp-sm:p-5 bp-sm:pt-0 bp-md:p-6 bp-md:pt-0">
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
