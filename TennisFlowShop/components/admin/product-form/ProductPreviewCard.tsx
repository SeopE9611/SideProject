"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ImageIcon, Palette, Percent, Ruler, Sparkles, Tag, TrendingUp } from "lucide-react";

interface ProductPreviewCardProps {
  basicInfo: {
    name: string;
    brand: string;
    material: string;
    price: number;
    shortDescription: string;
  };
  features: {
    power: number;
    control: number;
    spin: number;
    durability: number;
    comfort: number;
  };
  inventory: {
    isFeatured: boolean;
    isNew: boolean;
    isSale: boolean;
    salePrice: number;
    status: string;
  };
  colorCount: number;
  gaugeCount: number;
  imageCount: number;
  className?: string;
}

export function ProductPreviewCard({ basicInfo, features, inventory, colorCount, gaugeCount, imageCount, className }: ProductPreviewCardProps) {
  const hasName = basicInfo.name.trim().length > 0;
  const hasBrand = basicInfo.brand.trim().length > 0;
  const hasPrice = basicInfo.price > 0;
  const totalStock = colorCount + gaugeCount;

  const featureItems = [
    { key: "power", label: "반발력", value: features.power },
    { key: "control", label: "컨트롤", value: features.control },
    { key: "spin", label: "스핀", value: features.spin },
    { key: "durability", label: "내구성", value: features.durability },
    { key: "comfort", label: "편안함", value: features.comfort },
  ];

  const average = Math.round(featureItems.reduce((sum, item) => sum + item.value, 0) / featureItems.length);

  return (
    <div className={cn("sticky top-6 rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/20 p-5 shadow-lg", className)}>
      {/* Header */}
      <div className="mb-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">미리보기</p>
        <h3 className="line-clamp-2 text-lg font-bold text-foreground">{hasName ? basicInfo.name : "상품명을 입력하세요"}</h3>
        {hasBrand && <p className="mt-0.5 text-sm text-muted-foreground">{basicInfo.brand}</p>}
      </div>

      {/* Badges */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {inventory.isNew && (
          <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
            <Sparkles className="mr-1 h-3 w-3" />
            신상품
          </Badge>
        )}
        {inventory.isFeatured && (
          <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
            <TrendingUp className="mr-1 h-3 w-3" />
            추천
          </Badge>
        )}
        {inventory.isSale && (
          <Badge variant="default" className="bg-red-500 hover:bg-red-600">
            <Percent className="mr-1 h-3 w-3" />
            할인
          </Badge>
        )}
        {inventory.status === "outofstock" && (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            품절
          </Badge>
        )}
      </div>

      {/* Price */}
      <div className="mb-4">
        {inventory.isSale && inventory.salePrice > 0 ? (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-destructive">{inventory.salePrice.toLocaleString()}원</span>
            <span className="text-sm text-muted-foreground line-through">{hasPrice ? `${basicInfo.price.toLocaleString()}원` : "-"}</span>
          </div>
        ) : (
          <span className="text-2xl font-bold text-foreground">{hasPrice ? `${basicInfo.price.toLocaleString()}원` : "가격 미설정"}</span>
        )}
      </div>

      <Separator className="my-4" />

      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center rounded-lg bg-muted/40 p-2.5">
          <Palette className="mb-1 h-4 w-4 text-muted-foreground" />
          <span className="text-lg font-bold text-foreground">{colorCount}</span>
          <span className="text-[10px] text-muted-foreground">색상</span>
        </div>
        <div className="flex flex-col items-center rounded-lg bg-muted/40 p-2.5">
          <Ruler className="mb-1 h-4 w-4 text-muted-foreground" />
          <span className="text-lg font-bold text-foreground">{gaugeCount}</span>
          <span className="text-[10px] text-muted-foreground">게이지</span>
        </div>
        <div className="flex flex-col items-center rounded-lg bg-muted/40 p-2.5">
          <ImageIcon className="mb-1 h-4 w-4 text-muted-foreground" />
          <span className="text-lg font-bold text-foreground">{imageCount}</span>
          <span className="text-[10px] text-muted-foreground">이미지</span>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="rounded-lg bg-muted/30 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">성능 지표</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">평균 {average}</span>
        </div>
        <div className="space-y-1.5">
          {featureItems.map((item) => (
            <div key={item.key} className="flex items-center gap-2">
              <span className="w-12 text-[10px] text-muted-foreground">{item.label}</span>
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${item.value}%` }} />
              </div>
              <span className="w-6 text-right text-[10px] font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Material Tag */}
      {basicInfo.material && (
        <div className="mt-4 flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground capitalize">{basicInfo.material}</span>
        </div>
      )}
    </div>
  );
}
