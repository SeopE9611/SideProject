"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clearRecentViewedItems, getRecentViewedItems, type RecentViewedType } from "@/lib/recent-viewed";
import Link from "next/link";
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

const formatPrice = (price?: number | null) => {
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return null;
  return `${price.toLocaleString()}원`;
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
            <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">최근 확인한 스트링과 라켓을 다시 확인해보세요.</p>
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
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {filteredItems.map((item) => {
              const imageSrc = item.image || "/placeholder.svg";
              const priceLabel = formatPrice(item.price);
              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.href}
                  aria-label={`${typeLabelMap[item.type]} 상세로 이동: ${item.name}`}
                  className="group overflow-hidden rounded-xl border border-border/60 bg-background transition-[background-color,color,border-color,box-shadow,opacity] duration-200 hover:border-border hover:shadow-sm"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-muted/30">
                    <img src={imageSrc} alt={item.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  </div>
                  <div className="space-y-1.5 p-2.5 sm:p-3">
                    <Badge variant="secondary" className="text-[11px]">
                      {typeLabelMap[item.type]}
                    </Badge>
                    <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.name}</p>
                    {item.subtitle ? <p className="line-clamp-1 text-xs text-muted-foreground">{item.subtitle}</p> : null}
                    {priceLabel ? <p className="text-sm font-semibold text-foreground">{priceLabel}</p> : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
