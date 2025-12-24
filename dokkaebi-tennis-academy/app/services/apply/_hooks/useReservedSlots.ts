'use client';
import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

type SetState<T> = Dispatch<SetStateAction<T>>;

/**
 * 방문(visit) 예약 시간대의 마감(예약됨) 정보를 조회/캐시하고,
 * 로딩/에러/선택 시간 자동 해제 등의 UX 상태를 관리합니다.
 *
 * 주의: 기존 page.tsx의 로직을 "그대로" 옮긴 리팩터링 전용 훅입니다.
 * (동작 변경 없이 파일만 분리하는 목적)
 */
export function useReservedSlots<T extends { preferredTime: string }>(args: { preferredDate: string; preferredTime: string; requiredPassCount: number; setFormData: SetState<T> }) {
  const { preferredDate, preferredTime, requiredPassCount, setFormData } = args;

  // 예약 슬롯 상태
  const [disabledTimes, setDisabledTimes] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const slotsCache = useRef<Map<string, string[]>>(new Map());

  // 추가 상태: 캐시 히트 여부 (로딩 중 버튼 비활성화 여부 판단에 사용)
  const [hasCacheForDate, setHasCacheForDate] = useState(false);

  useEffect(() => {
    const date = preferredDate;
    if (!date) {
      setDisabledTimes([]);
      setSlotsError(null);
      setHasCacheForDate(false);
      return;
    }

    // 캐시 확인: 있으면 즉시 사용(플리커 방지)
    const cached = slotsCache.current.get(date);
    const cacheHit = Array.isArray(cached);
    setHasCacheForDate(!!cacheHit);
    if (cacheHit) {
      setDisabledTimes(cached!);
      setSlotsError(null);
      // 캐시가 있으면 버튼 비활성화 없이 조용히 갱신만 진행
    }

    const controller = new AbortController();

    // 짧은 로딩은 숨기는 디바운스(120ms)
    let loadingTimer: ReturnType<typeof setTimeout> | null = null;
    if (!cacheHit) {
      loadingTimer = setTimeout(() => setSlotsLoading(true), 120);
    }

    (async () => {
      try {
        setSlotsError(null);

        const cap = Math.max(requiredPassCount || 1, 1);

        const res = await fetch(`/api/applications/stringing/reserved?date=${encodeURIComponent(date)}&cap=${cap}`, {
          method: 'GET',
          signal: controller.signal,
          credentials: 'include',
        });

        if (!res.ok) {
          // 30일 초과/미만 등 '정책 위반'은 서버 메시지를 그대로 노출
          if (res.status === 400) {
            const j = await res.json().catch(() => null);
            setSlotsError(j?.message ?? '현재 날짜부터 30일 이내만 예약 가능합니다. 다른 날짜를 선택해주세요.');
            // 시간대 격자는 감춤
            setTimeSlots([]);
            setDisabledTimes([]);
            // 선택된 시간도 해제
            setFormData((prev) => ({ ...prev, preferredTime: '' } as T));
            return;
          }

          // 그 외(500/네트워크 등)만 일반 오류로 처리
          if (!cacheHit) setDisabledTimes([]);
          setSlotsError('예약 현황을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
          return;
        }

        const data = await res.json();
        setSlotsError(null); // 성공 시 에러 초기화

        // 휴무/비영업일 처리
        if (data?.closed === true) {
          setSlotsError('해당 날짜는 휴무일입니다. 다른 날짜를 선택해주세요.');
          setTimeSlots([]);
          setDisabledTimes([]);
          setFormData((prev) => ({ ...prev, preferredTime: '' } as T));
          return;
        }

        // 서버 슬롯/마감 반영
        setTimeSlots(Array.isArray(data?.allTimes) ? data.allTimes : []);
        setDisabledTimes(Array.isArray(data?.reservedTimes) ? data.reservedTimes : []);

        // (선택) 현재 선택된 시간이 사용 불가면 선택 해제
        if (data?.availableTimes && !data.availableTimes.includes(preferredTime)) {
          setFormData((prev) => ({ ...prev, preferredTime: '' } as T));
        }

        // 사용자가 로딩 중에 선택해둔 시간이 새로 "비활성"이 되면 해제
        setFormData((prev) => (prev.preferredTime && (data?.reservedTimes?.includes(prev.preferredTime) ?? false) ? ({ ...prev, preferredTime: '' } as T) : prev));
      } catch {
        if (!cacheHit) {
          setDisabledTimes([]);
          setSlotsError('예약 현황을 불러오지 못했습니다. 네트워크 상태를 확인해주세요.');
        }
      } finally {
        if (loadingTimer) clearTimeout(loadingTimer);
        setSlotsLoading(false);
      }
    })();

    return () => {
      if (loadingTimer) clearTimeout(loadingTimer);
      controller.abort();
    };
    // NOTE: 기존 코드와 동일하게 preferredDate만 의존합니다. (동작 변경 방지)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferredDate]);

  // 사용자가 이미 비활성화된 시간을 선택해 둔 경우 자동 해제
  useEffect(() => {
    if (preferredTime && disabledTimes.includes(preferredTime)) {
      setFormData((prev) => ({ ...prev, preferredTime: '' } as T));
    }
  }, [disabledTimes, preferredTime, setFormData]);

  // 날짜 바꾸면 시간 자동 초기화
  useEffect(() => {
    if (!preferredDate) return;
    // 날짜 변경 시 선택된 시간 초기화
    setFormData((prev) => (prev.preferredTime ? ({ ...prev, preferredTime: '' } as T) : prev));
    // 캐시에 같은 날짜가 있어도 초기화는 고정 동작
  }, [preferredDate, setFormData]);

  // 409(동시 예약 등) 발생 시 즉시 최신 예약 상태를 다시 가져오고 UI를 갱신
  const refetchDisabledTimesFor = async (date: string) => {
    if (!date) return;
    try {
      const cap = Math.max(requiredPassCount || 1, 1);

      const res = await fetch(`/api/applications/stringing/reserved?date=${encodeURIComponent(date)}&cap=${cap}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const times: string[] = Array.isArray(data?.reservedTimes) ? data.reservedTimes : [];
      slotsCache.current.set(date, times);
      setDisabledTimes(times);
    } catch {
      // 조용히 실패 무시
    }
  };

  return { disabledTimes, timeSlots, slotsLoading, slotsError, hasCacheForDate, refetchDisabledTimesFor };
}
