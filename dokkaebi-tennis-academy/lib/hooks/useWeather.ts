'use client';

import useSWR from 'swr';

type WeatherResponse = {
  ok: boolean;
  temp: number | null;
  tempMin: number | null;
  tempMax: number | null;
  description: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useWeather() {
  const { data, error, isLoading } = useSWR<WeatherResponse>('/api/weather', fetcher, {
    revalidateOnFocus: false, // 포커스마다 새로 불러올 필요는 없음
    dedupingInterval: 10 * 60 * 1000, // 10분 동안은 응답 재사용
  });

  return {
    weather: data,
    isLoading,
    isError: !!error,
  };
}
