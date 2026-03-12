'use client';

import useSWR from 'swr';

type WeatherResponse = {
  ok: boolean;
  temp: number | null;
  tempMin: number | null;
  tempMax: number | null;
  description: string;
};

const fetcher = async (url: string): Promise<WeatherResponse> => {
  const response = await fetch(url);
  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    throw new Error(`HTTP_${response.status}`);
  }

  if (!isJson) {
    throw new Error('INVALID_CONTENT_TYPE');
  }

  try {
    return (await response.json()) as WeatherResponse;
  } catch (error) {
    throw error instanceof Error ? error : new Error('INVALID_JSON');
  }
};

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
