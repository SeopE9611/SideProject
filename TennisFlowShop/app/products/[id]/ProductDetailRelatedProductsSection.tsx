import type { ComponentType, ReactNode, RefObject } from "react";

import type { HItem } from "@/components/HorizontalProducts";

type ProductDetailRelatedProductsSectionProps = {
  HorizontalProducts: ComponentType<any>;
  relatedSectionRef: RefObject<HTMLElement | null>;
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
    <>
      <section
        ref={relatedSectionRef}
        className="mt-8 bp-md:mt-10"
        aria-labelledby="related-products-title"
      >
        <h2
          id="related-products-title"
          className="mb-4 break-keep text-ui-card-title-lg font-ui-bold leading-snug bp-sm:text-ui-section-title"
        >
          관련 상품
        </h2>
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
      </section>
      {children}
    </>
  );
}
