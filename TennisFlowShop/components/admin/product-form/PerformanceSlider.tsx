"use client";

import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface PerformanceSliderProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

function getPerformanceLevel(value: number): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (value <= 20)
    return {
      label: "매우 낮음",
      color: "text-destructive",
      bgColor: "bg-destructive",
    };
  if (value <= 40) return { label: "낮음", color: "text-warning", bgColor: "bg-warning" };
  if (value <= 60)
    return {
      label: "보통",
      color: "text-muted-foreground",
      bgColor: "bg-muted-foreground",
    };
  if (value <= 80) return { label: "높음", color: "text-info", bgColor: "bg-info" };
  return { label: "매우 높음", color: "text-success", bgColor: "bg-success" };
}

export function PerformanceSlider({
  id,
  label,
  value,
  onChange,
  min = 1,
  max = 100,
  step = 1,
  className,
}: PerformanceSliderProps) {
  const level = getPerformanceLevel(value);
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div
      className={cn("space-y-3 rounded-xl border border-border/50 bg-background/60 p-4", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <Label htmlFor={id} className={adminTypography.bodyStrong}>
            {label}
          </Label>
          <p className={adminTypography.caption}>1~100 점수로 성능 특성을 조정합니다.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={cn(adminTypography.caption, "font-medium", level.color)}>
            {level.label}
          </span>
          <span
            className={cn(
              "min-w-[3rem] rounded-lg bg-primary/10 px-2.5 py-1 text-center text-primary",
              adminTypography.bodyStrong,
            )}
          >
            {value}
          </span>
        </div>
      </div>

      <div className="relative">
        {/* Custom gradient track background */}
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-destructive/25 via-warning/25 to-success/25" />

        {/* Active track */}
        <div
          className={cn(
            "absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-l-full transition-all duration-150",
            level.bgColor,
          )}
          style={{ width: `${percentage}%`, opacity: 0.7 }}
        />

        <Slider
          id={id}
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={(v) => onChange(v[0])}
          className="relative [&>[data-slider-track]]:bg-transparent [&>[data-slider-range]]:bg-transparent"
        />
      </div>

      <div className={cn("flex justify-between px-1", adminTypography.caption)}>
        <span>최저</span>
        <span>낮음</span>
        <span>보통</span>
        <span>높음</span>
        <span>최고</span>
      </div>
    </div>
  );
}

interface PerformanceSummaryProps {
  features: {
    power: number;
    control: number;
    spin: number;
    durability: number;
    comfort: number;
  };
  className?: string;
}

export function PerformanceSummary({ features, className }: PerformanceSummaryProps) {
  const items = [
    { key: "power", label: "반발력", value: features.power },
    { key: "control", label: "컨트롤", value: features.control },
    { key: "spin", label: "스핀", value: features.spin },
    { key: "durability", label: "내구성", value: features.durability },
    { key: "comfort", label: "편안함", value: features.comfort },
  ];

  const average = Math.round(items.reduce((sum, item) => sum + item.value, 0) / items.length);

  return (
    <div className={cn(adminSurface.cardMuted, "p-4", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h4 className={adminTypography.panelTitle}>성능 요약</h4>
        <div className="flex items-center gap-2">
          <span className={adminTypography.caption}>평균</span>
          <span className="rounded-full bg-primary px-2 py-0.5 text-ui-label font-bold text-primary-foreground">
            {average}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const level = getPerformanceLevel(item.value);
          return (
            <div key={item.key} className="flex items-center gap-3">
              <span className={cn("w-16", adminTypography.caption)}>{item.label}</span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all duration-300", level.bgColor)}
                  style={{ width: `${item.value}%`, opacity: 0.7 }}
                />
              </div>
              <span
                className={cn("w-8 text-right", adminTypography.caption, "font-medium text-foreground")}
              >
                {item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
