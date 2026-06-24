"use client";

import { useWeather } from "@/lib/hooks/useWeather";
import { Loader2 } from "lucide-react";

export function WeatherBadge() {
  const { weather, isLoading, isError } = useWeather();

  if (isLoading) {
    return (
      <div className="rounded-lg px-4 py-2 text-ui-body-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        오늘 테니스 치기 좋은지 확인 중이에요
      </div>
    );
  }

  if (isError || !weather || !weather.ok) {
    return (
      <div className="rounded-lg px-4 py-2 text-ui-body-sm text-muted-foreground">
        날씨 정보를 가져오지 못했어요. (개발진행중)
      </div>
    );
  }

  const { temp, tempMin, tempMax, description } = weather;

  // temp가 null일 수도 있으니 방어적으로 처리
  const mainTemp = temp != null ? `${Math.round(temp)}°C` : "-";
  const min = tempMin != null ? `${Math.round(tempMin)}°` : "-";
  const max = tempMax != null ? `${Math.round(tempMax)}°` : "-";

  // 간단한 카피: 상황에 따라 문구 바꾸고 싶으면 여기를 조정하면 됨
  const mood =
    temp != null && temp >= 5 && temp <= 30 && !String(description).includes("비")
      ? "테니스 치기 괜찮은 날씨네요!"
      : "오늘은 컨디션 봐가면서 플레이해보세요.";

  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 px-4 py-2 text-ui-body-sm sm:flex-row sm:items-center">
      <div className="font-medium">
        {mainTemp}{" "}
        <span className="text-ui-label text-muted-foreground sm:text-ui-body-sm">
          (최저 {min} / 최고 {max})
        </span>
      </div>
      <div className="text-ui-label text-muted-foreground sm:text-ui-body-sm">
        {description && `지금은 "${description}" 상태예요. `}
        {mood}
      </div>
    </div>
  );
}
