"use client";

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
  if (value <= 40)
    return { label: "낮음", color: "text-warning", bgColor: "bg-warning" };
  if (value <= 60)
    return {
      label: "보통",
      color: "text-muted-foreground",
      bgColor: "bg-muted-foreground",
    };
  if (value <= 80)
    return { label: "높음", color: "text-info", bgColor: "bg-info" };
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
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-medium", level.color)}>
            {level.label}
          </span>
          <span className="min-w-[3rem] rounded-md bg-primary/10 px-2 py-1 text-center text-sm font-bold text-primary">
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

      <div className="flex justify-between px-1">
        <span className="text-[10px] text-muted-foreground">최저</span>
        <span className="text-[10px] text-muted-foreground">낮음</span>
        <span className="text-[10px] text-muted-foreground">보통</span>
        <span className="text-[10px] text-muted-foreground">높음</span>
        <span className="text-[10px] text-muted-foreground">최고</span>
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

export function PerformanceSummary({
  features,
  className,
}: PerformanceSummaryProps) {
  const items = [
    { key: "power", label: "반발력", value: features.power },
    { key: "control", label: "컨트롤", value: features.control },
    { key: "spin", label: "스핀", value: features.spin },
    { key: "durability", label: "내구성", value: features.durability },
    { key: "comfort", label: "편안함", value: features.comfort },
  ];

  const average = Math.round(
    items.reduce((sum, item) => sum + item.value, 0) / items.length,
  );

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-muted/20 p-4",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">성능 요약</h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">평균</span>
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
            {average}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const level = getPerformanceLevel(item.value);
          return (
            <div key={item.key} className="flex items-center gap-3">
              <span className="w-16 text-xs text-muted-foreground">
                {item.label}
              </span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    level.bgColor,
                  )}
                  style={{ width: `${item.value}%`, opacity: 0.7 }}
                />
              </div>
              <span className="w-8 text-right text-xs font-medium">
                {item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
