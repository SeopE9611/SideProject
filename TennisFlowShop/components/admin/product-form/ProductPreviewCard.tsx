"use client";

import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
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

export function ProductPreviewCard({
  basicInfo,
  features,
  inventory,
  colorCount,
  gaugeCount,
  imageCount,
  className,
}: ProductPreviewCardProps) {
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

  const average = Math.round(
    featureItems.reduce((sum, item) => sum + item.value, 0) / featureItems.length,
  );

  return (
    <div className={cn(adminSurface.card, "sticky top-6 p-5", className)}>
      {/* Header */}
      <div className="mb-4">
        <p className={cn("mb-1 uppercase tracking-wider", adminTypography.caption)}>미리보기</p>
        <h3 className={cn("line-clamp-2", adminTypography.panelTitle)}>
          {hasName ? basicInfo.name : "상품명을 입력하세요"}
        </h3>
        {hasBrand && <p className={cn("mt-0.5", adminTypography.metaMuted)}>{basicInfo.brand}</p>}
      </div>

      {/* Badges */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {inventory.isNew && (
          <Badge variant="info">
            <Sparkles className="mr-1 h-3 w-3" />
            신상품
          </Badge>
        )}
        {inventory.isFeatured && (
          <Badge variant="warning">
            <TrendingUp className="mr-1 h-3 w-3" />
            추천
          </Badge>
        )}
        {inventory.isSale && (
          <Badge variant="destructive">
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
            <span className={cn(adminTypography.kpiValueCompact, "text-destructive")}>
              {inventory.salePrice.toLocaleString()}원
            </span>
            <span className={cn("line-through", adminTypography.metaMuted)}>
              {hasPrice ? `${basicInfo.price.toLocaleString()}원` : "-"}
            </span>
          </div>
        ) : (
          <span className={adminTypography.kpiValueCompact}>
            {hasPrice ? `${basicInfo.price.toLocaleString()}원` : "가격 미설정"}
          </span>
        )}
      </div>

      <Separator className="my-4" />

      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className={cn(adminSurface.cardMuted, "flex flex-col items-center p-2.5")}>
          <Palette className="mb-1 h-4 w-4 text-muted-foreground" />
          <span className={adminTypography.bodyStrong}>{colorCount}</span>
          <span className={adminTypography.caption}>색상</span>
        </div>
        <div className={cn(adminSurface.cardMuted, "flex flex-col items-center p-2.5")}>
          <Ruler className="mb-1 h-4 w-4 text-muted-foreground" />
          <span className={adminTypography.bodyStrong}>{gaugeCount}</span>
          <span className={adminTypography.caption}>게이지</span>
        </div>
        <div className={cn(adminSurface.cardMuted, "flex flex-col items-center p-2.5")}>
          <ImageIcon className="mb-1 h-4 w-4 text-muted-foreground" />
          <span className={adminTypography.bodyStrong}>{imageCount}</span>
          <span className={adminTypography.caption}>이미지</span>
        </div>
      </div>

      {/* Performance Chart */}
      <div className={cn(adminSurface.cardMuted, "p-3")}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className={cn(adminTypography.caption, "font-medium")}>성능 지표</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-ui-label font-semibold text-primary">
            평균 {average}
          </span>
        </div>
        <div className="space-y-1.5">
          {featureItems.map((item) => (
            <div key={item.key} className="flex items-center gap-2">
              <span className={cn("w-12", adminTypography.caption)}>{item.label}</span>
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${item.value}%` }}
                />
              </div>
              <span className={cn("w-6 text-right font-medium", adminTypography.caption)}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Material Tag */}
      {basicInfo.material && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={cn("capitalize", adminTypography.metaMuted)}>{basicInfo.material}</span>
        </div>
      )}
    </div>
  );
}
