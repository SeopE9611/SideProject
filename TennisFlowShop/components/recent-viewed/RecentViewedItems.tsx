"use client";

import HorizontalProducts, { type HItem } from "@/components/HorizontalProducts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  clearRecentViewedItems,
  getRecentViewedItems,
  type RecentViewedType,
} from "@/lib/recent-viewed";
import { useEffect, useMemo, useState } from "react";

type RecentViewedItemsProps = {
  currentType?: RecentViewedType;
  currentId?: string;
  title?: string;
  limit?: number;
};

const typeLabelMap: Record<RecentViewedType, string> = {
  product: "스트링",
  racket: "라켓",
};

export default function RecentViewedItems({
  currentType,
  currentId,
  title = "최근 본 상품/라켓",
  limit = 6,
}: RecentViewedItemsProps) {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<ReturnType<typeof getRecentViewedItems>>([]);

  useEffect(() => {
    setMounted(true);
    setItems(getRecentViewedItems());
  }, []);

  const filteredItems = useMemo(() => {
    const id = (currentId ?? "").trim();
    return items
      .filter((item) => !(currentType && id && item.type === currentType && item.id === id))
      .slice(0, Math.max(1, limit));
  }, [items, currentId, currentType, limit]);

  if (!mounted || filteredItems.length === 0) return null;

  return (
    <section className="mt-8 sm:mt-12" aria-label={title}>
      <Card className="rounded-3xl border border-border/60 bg-card shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-ui-card-title-lg sm:text-ui-section-title">
              {title}
            </CardTitle>
            <p className="mt-1 text-ui-body-sm text-muted-foreground">
              최근 확인한 스트링과 라켓을 다시 확인해보세요.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              clearRecentViewedItems();
              setItems([]);
            }}
            aria-label="최근 본 상품과 라켓 전체 지우기"
          >
            전체 지우기
          </Button>
        </CardHeader>
        <CardContent>
          <HorizontalProducts
            title={title}
            items={filteredItems.map((item): HItem => ({
              _id: `${item.type}-${item.id}`,
              name: item.name,
              price: item.price ?? 0,
              images: item.image ? [item.image] : [],
              brand:
                item.type === "racket"
                  ? typeLabelMap[item.type]
                  : item.subtitle || typeLabelMap[item.type],
              href: item.href,
            }))}
            moreHref="/products"
            showHeader={false}
            showMoreCard={false}
            cardWidthClass="flex-none basis-[calc((100%-12px)/2)] bp-sm:basis-[calc((100%-16px)/2)] bp-md-only:basis-[calc((100%-40px)/3)] bp-lg:basis-[calc((100%-72px)/4)]"
          />
        </CardContent>
      </Card>
    </section>
  );
}
