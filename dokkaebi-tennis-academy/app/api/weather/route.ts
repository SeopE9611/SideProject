import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const lat = process.env.WEATHER_LAT ?? '37.5665'; // 기본값: 서울
  const lon = process.env.WEATHER_LON ?? '126.9780'; // 기본값: 서울

  if (!apiKey) {
    return NextResponse.json({ ok: false, message: 'OPENWEATHER_API_KEY가 설정되어 있지 않습니다.' }, { status: 500 });
  }

  try {
    const url = new URL('https://api.openweathermap.org/data/2.5/weather');
    url.searchParams.set('lat', lat);
    url.searchParams.set('lon', lon);
    url.searchParams.set('appid', apiKey);
    url.searchParams.set('units', 'metric'); // 섭씨
    url.searchParams.set('lang', 'kr'); // 한국어 설명

    const res = await fetch(url.toString(), {
      // 캐시가 오래 남으면 의미가 없으니 짧게 잡거나 no-store 처리
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, message: '외부 날씨 API 호출에 실패했습니다.' }, { status: 500 });
    }

    const data = await res.json();

    // 우리가 실제로 쓸 핵심 필드만 추려서 응답
    const payload = {
      ok: true,
      temp: data.main?.temp ?? null,
      tempMin: data.main?.temp_min ?? null,
      tempMax: data.main?.temp_max ?? null,
      // 대표 날씨 설명 (ex. '맑음', '흐림')
      description: data.weather?.[0]?.description ?? '',
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error('Weather API error:', err);
    return NextResponse.json({ ok: false, message: '날씨 정보를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
