"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { NAV_FLAGS, NAV_LINKS } from "./nav.config";

export default function SideMenu() {
  const pathname = usePathname();
  const search = useSearchParams();
  const isProductsCatalog = pathname === "/products";

  const createCatalogHref = ({
    set,
    remove = [],
  }: {
    set?: Record<string, string>;
    remove?: string[];
  }) => {
    const params = new URLSearchParams(search?.toString());
    remove.forEach((key) => params.delete(key));
    Object.entries(set ?? {}).forEach(([key, value]) => params.set(key, value));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const getFilterHref = (href: string) => {
    const url = new URL(href, "http://dummy.local");
    return createCatalogHref({
      set: Object.fromEntries(url.searchParams.entries()),
    });
  };

  const isActiveHref = (href: string) => {
    const url = new URL(href, "http://dummy.local");

    if (url.pathname === "/rackets" && url.searchParams.has("brand")) {
      return pathname === "/rackets" && search?.get("brand") === url.searchParams.get("brand");
    }

    if (url.pathname === "/rackets") return pathname === "/rackets" && !search?.get("brand");

    if (url.pathname === "/products" && url.searchParams.has("brand")) {
      return pathname === "/products" && search?.get("brand") === url.searchParams.get("brand");
    }

    if (url.pathname === "/products" && url.searchParams.has("material")) {
      return pathname === "/products" && search?.get("material") === url.searchParams.get("material");
    }

    if (url.pathname === "/products") {
      return pathname === "/products" && !search?.get("brand") && !search?.get("material");
    }

    return pathname === url.pathname;
  };

  const linkClass = (href: string) =>
    cn(
      "group relative z-0 block rounded-control border border-transparent px-3 py-2.5 text-ui-body-sm font-medium transition-[background-color,color,border-color,box-shadow,opacity] duration-200 before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:rounded-full before:bg-transparent",
      "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      isActiveHref(href)
        ? "border-border bg-muted/60 font-ui-medium text-foreground before:bg-brand-highlight"
        : "text-foreground/75 hover:text-foreground",
    );

  const brandLinkClass = (href: string) =>
    cn(
      "group relative z-0 block rounded-control px-3 py-2 text-ui-label font-medium whitespace-nowrap transition-[background-color,color,border-color,box-shadow,opacity] duration-200",
      "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      isActiveHref(href) ? "bg-muted/50 font-ui-medium text-foreground" : "text-foreground/75 hover:text-foreground",
    );

  const brands = isProductsCatalog ? NAV_LINKS.strings.brands : NAV_LINKS.rackets.brands;
  const catalogTitle = isProductsCatalog ? "스트링" : "도깨비 인증 중고 라켓";
  const catalogRoot = createCatalogHref({
    remove: isProductsCatalog ? ["brand", "material"] : ["brand"],
  });

  return (
    <aside
      className="fixed left-0 z-30 hidden h-[calc(100vh-var(--header-h,4rem))] w-72 overflow-hidden border-r border-border/80 bg-card bp-lg:block bp-lg:w-72 xl:w-80"
      style={{ top: "var(--header-h, 4rem)" }}
      aria-label={isProductsCatalog ? "스트링 메뉴" : "도깨비 인증 중고 라켓 메뉴"}
    >
      <div className="h-full space-y-3 overflow-y-auto px-5 py-4 scrollbar-hide">
        <h2 className="px-3 text-ui-card-title-lg font-ui-medium text-foreground">{catalogTitle}</h2>
        <Link href={catalogRoot} className={linkClass(catalogRoot)}>
          <span className="flex items-center justify-between">
            전체 보기
            <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-[background-color,color,border-color,box-shadow,opacity] duration-200 group-hover:opacity-100" />
          </span>
        </Link>

        {NAV_FLAGS.SHOW_BRAND_MENU && brands.length > 0 && (
          <Accordion type="single" className="space-y-1">
            <AccordionItem value="brands" className="border-none">
              <AccordionTrigger value="brands" className="min-h-10 rounded-control px-3 py-2 text-ui-label font-medium text-foreground/70 hover:bg-muted/40 hover:text-foreground hover:no-underline">
                브랜드
              </AccordionTrigger>
              <AccordionContent value="brands" className="pb-0 pt-1">
                <div className="grid grid-cols-2 gap-1 px-1">
                  {brands.map((brand) => (
                    <Link key={brand.href} href={getFilterHref(brand.href)} className={brandLinkClass(brand.href)}>
                      {brand.name}
                    </Link>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        <div className="space-y-0.5 border-t border-border/60 pt-3">
          {isProductsCatalog ? (
            <>
              <Link href="/products/recommend" className={linkClass("/products/recommend")}>스트링 추천</Link>
              <Link href="/services" className={linkClass("/services")}>교체서비스 시작하기</Link>
              <Link href="/services/tension-guide" className={linkClass("/services/tension-guide")}>텐션 가이드</Link>
              <Link href="/services/pricing" className={linkClass("/services/pricing")}>가격 안내</Link>
              <Link href="/services/packages" className={linkClass("/services/packages")}>스트링 교체 할인 패키지</Link>
            </>
          ) : (
            <>
              <Link href="/rackets/finder" className={linkClass("/rackets/finder")}>라켓 찾기</Link>
              <Link href="/rackets/compare" className={linkClass("/rackets/compare")}>라켓 비교</Link>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
