import type { Db } from 'mongodb';

export type ExceptionItem = {
  date: string;
  closed?: boolean;
  start?: string;
  end?: string;
  interval?: number;
  capacity?: number;
};

export type StringingSettings = {
  _id: 'stringingSlots';
  capacity?: number;
  businessDays?: number[];
  start?: string;
  end?: string;
  interval?: number;
  holidays?: string[];
  exceptions?: ExceptionItem[];
  bookingWindowDays?: number;
};

const SETTINGS_COLLECTION = 'settings';
const SETTINGS_ID: StringingSettings['_id'] = 'stringingSlots';

/**
 * 1) 설정 로드 + projection
 */
export async function loadStringingSettings(db: Db): Promise<StringingSettings | null> {
  const doc = await db.collection<StringingSettings>(SETTINGS_COLLECTION).findOne(
    { _id: SETTINGS_ID },
    {
      projection: {
        capacity: 1,
        businessDays: 1,
        start: 1,
        end: 1,
        interval: 1,
        holidays: 1,
        exceptions: 1,
        bookingWindowDays: 1,
      },
    }
  );

  return doc;
}

/**
 * 2) 예약 가능 기간 검증 (오늘 ~ WINDOW_DAYS 이내)
 *  - 기존 handleGetReservedTimeSlots의 WINDOW_DAYS 로직 그대로 분리
 */
export function validateBookingWindow(
  settings: StringingSettings | null,
  date: string
): {
  ok: boolean;
  windowDays: number;
  message?: string;
} {
  const WINDOW_DAYS = Number(settings?.bookingWindowDays ?? 30);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${date}T00:00:00`);
  const max = new Date();
  max.setHours(0, 0, 0, 0);
  max.setDate(max.getDate() + WINDOW_DAYS);

  if (target < today || target > max) {
    return {
      ok: false,
      windowDays: WINDOW_DAYS,
      message: `예약 가능 기간을 벗어났습니다. (오늘부터 ${WINDOW_DAYS}일 이내만 예약 가능)`,
    };
  }

  return { ok: true, windowDays: WINDOW_DAYS };
}

/**
 * 3) 특정 날짜에 대한 "유효 설정" 계산
 *  - 기본값 + 요일(businessDays) + holidays + exceptions 적용
 */
export function resolveDaySchedule(
  settings: StringingSettings | null,
  date: string
): {
  isOpen: boolean;
  capacity: number;
  start: string;
  end: string;
  interval: number;
  businessDays: number[];
  holidays: string[];
  exceptions: ExceptionItem[];
} {
  // 기본값
  let capacity = Math.max(1, Math.min(10, Number(settings?.capacity ?? 1)));
  let start = typeof settings?.start === 'string' ? settings.start! : '10:00';
  let end = typeof settings?.end === 'string' ? settings.end! : '19:00';
  let interval = Number.isFinite(settings?.interval) ? Number(settings!.interval) : 30;

  const bizDays = Array.isArray(settings?.businessDays) ? settings!.businessDays! : [1, 2, 3, 4, 5];
  const holidays = Array.isArray(settings?.holidays) ? settings!.holidays! : [];
  const exceptions = Array.isArray(settings?.exceptions) ? settings!.exceptions! : [];

  // 예외일 우선 적용
  const ex = exceptions.find((e) => e.date === date);
  const jsDay = new Date(`${date}T00:00:00`).getDay();

  let isOpen: boolean;
  if (ex) {
    if (ex.closed) {
      // 예외일 휴무
      isOpen = false;
    } else {
      // 예외일: 영업 + 값 오버라이드
      isOpen = true;
      if (ex.start) start = ex.start;
      if (ex.end) end = ex.end;
      if (typeof ex.interval === 'number') {
        interval = Math.max(5, Math.min(240, Math.floor(ex.interval)));
      }
      if (typeof ex.capacity === 'number') {
        capacity = Math.max(1, Math.min(10, Math.floor(ex.capacity)));
      }
    }
  } else {
    // 예외가 없으면: 요일/연휴 정책으로 영업 여부 결정
    const isHoliday = holidays.includes(date);
    isOpen = bizDays.includes(jsDay) && !isHoliday;
  }

  return {
    isOpen,
    capacity,
    start,
    end,
    interval,
    businessDays: bizDays,
    holidays,
    exceptions,
  };
}

/**
 * 4) 슬롯 생성 헬퍼 (HH:mm <-> 분)
 */
const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const toHHMM = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(h)}:${pad(m)}`;
};

/**
 * 주어진 날짜의 유효 설정을 바탕으로 전체 슬롯 리스트 생성
 * - 영업 안 하는 날이면 빈 배열 반환
 */
export function generateAllTimesForDay(schedule: { isOpen: boolean; start: string; end: string; interval: number }): string[] {
  if (!schedule.isOpen) return [];

  const startMin = toMin(schedule.start);
  const endMin = toMin(schedule.end);
  const step = Math.max(5, Math.min(240, Math.floor(schedule.interval)));

  const times: string[] = [];
  for (let t = startMin; t <= endMin; t += step) {
    times.push(toHHMM(t));
  }
  return times;
}

// 연속 슬롯(span) 계산 결과 타입
export type SlotSpanResult = {
  slots: string[]; // 실제로 점유하게 될 시간대들 [ "10:00", "10:30", ... ]
  startIndex: number; // allTimes 기준 시작 인덱스
  endIndex: number; // allTimes 기준 끝 인덱스
};

/**
 * allTimes 배열에서 preferredTime을 시작으로 slotCount 만큼의
 * "연속 슬롯(span)"을 계산한다.
 *
 * - preferredTime 이 allTimes 안에 없거나
 * - slotCount < 1 이거나
 * - 끝까지 span 을 확보할 수 없으면 null 을 반환한다.
 *
 * 이 함수는 순수 함수라 DB 접근 없이도 테스트/재사용이 쉽다.
 */
export function computeSlotSpan(allTimes: string[], preferredTime: string, slotCount: number): SlotSpanResult | null {
  if (!Array.isArray(allTimes) || allTimes.length === 0) return null;
  if (!preferredTime || typeof preferredTime !== 'string') return null;

  const count = Math.max(1, Math.floor(slotCount));
  if (!Number.isFinite(count) || count < 1) return null;

  const startIndex = allTimes.indexOf(preferredTime);
  if (startIndex === -1) {
    // "10:05" 같이 슬롯 리스트에 없는 시간대를 넣으면 span 계산 불가
    return null;
  }

  const endIndex = startIndex + count - 1;
  if (endIndex >= allTimes.length) {
    // 예: 마지막 슬롯에서 3슬롯 요청 → 하루 영업시간을 넘어가므로 span 불가
    return null;
  }

  const slots = allTimes.slice(startIndex, endIndex + 1);
  return { slots, startIndex, endIndex };
}

/**
 * 하루 스케줄 + 시작시간 + 슬롯 개수를 기반으로
 * 실제 점유할 연속 슬롯(span)을 계산하는 편의 헬퍼.
 *
 * - schedule.isOpen 이 false 이면 null 반환
 * - 내부에서는 generateAllTimesForDay 를 호출한 뒤 computeSlotSpan 을 재사용한다.
 */
export function computeSpanSlotsForVisit(
  schedule: {
    isOpen: boolean;
    start: string;
    end: string;
    interval: number;
  },
  preferredTime: string,
  slotCount: number
): SlotSpanResult | null {
  if (!schedule.isOpen) return null;

  const allTimes = generateAllTimesForDay(schedule);
  if (!allTimes.length) return null;

  return computeSlotSpan(allTimes, preferredTime, slotCount);
}

/**
 * 멀티 슬롯(span)을 고려해서 "완전히 마감된 시간대"를 계산한다.
 *
 * - 각 신청서는 visitSlotCount(슬롯 개수)를 기준으로 연속 슬롯(span)을 점유
 * - span 에 포함된 각 슬롯마다 1씩 점유량을 누적
 * - 누적 count >= capacity 인 슬롯들을 "마감된 시간"으로 간주
 *
 * 기존 findFullyBookedTimes 가 단일 슬롯만 보던 방식에서
 * 멀티 슬롯을 고려한 버전이라고 보면 된다.
 */
export async function findFullyBookedTimesWithSpan(db: Db, date: string, capacity: number, allTimes: string[]): Promise<string[]> {
  if (!allTimes.length || capacity <= 0) return [];

  const EXCLUDED = ['취소', 'draft'];

  type Doc = {
    stringDetails?: {
      preferredTime?: string;
    };
    visitSlotCount?: number;
    status?: string;
  };

  const docs = await db
    .collection<Doc>('stringing_applications')
    .find(
      {
        'stringDetails.preferredDate': date,
        'stringDetails.preferredTime': { $type: 'string', $ne: '' },
        status: { $nin: EXCLUDED },
      },
      {
        projection: {
          'stringDetails.preferredTime': 1,
          visitSlotCount: 1,
          status: 1,
        },
      }
    )
    .toArray();

  // 각 시간대별 점유 인원 수
  const counts = new Map<string, number>();

  for (const doc of docs) {
    const baseTime = doc.stringDetails?.preferredTime;
    if (!baseTime || typeof baseTime !== 'string') continue;

    const time = baseTime.trim();
    if (!time) continue;

    // 슬롯 개수: visitSlotCount 가 있으면 그 값을, 없으면 1 슬롯으로 간주
    const rawCount = typeof doc.visitSlotCount === 'number' ? Math.floor(doc.visitSlotCount) : 1;
    const slotCount = rawCount > 0 ? rawCount : 1;

    // 연속 슬롯(span) 계산
    const span = computeSlotSpan(allTimes, time, slotCount);

    // span 을 계산할 수 없으면, 최소한 시작 슬롯만이라도 차지했다고 본다.
    if (!span) {
      if (allTimes.includes(time)) {
        counts.set(time, (counts.get(time) ?? 0) + 1);
      }
      continue;
    }

    // span 에 포함된 각 슬롯에 대해 점유 1씩 증가
    for (const slot of span.slots) {
      counts.set(slot, (counts.get(slot) ?? 0) + 1);
    }
  }

  // capacity 이상 찬 슬롯만 "마감"으로 간주
  const fullyBooked: string[] = [];
  for (const t of allTimes) {
    const c = counts.get(t) ?? 0;
    if (c >= capacity) {
      fullyBooked.push(t);
    }
  }

  return fullyBooked;
}

/**
 * 5) 해당 날짜에서 "capacity 이상" 찬 시간대 목록 조회
 *  - 기존 aggregate 그대로 분리
 */
export async function findFullyBookedTimes(db: Db, date: string, capacity: number): Promise<string[]> {
  const EXCLUDED = ['취소', 'draft'];

  const rows = await db
    .collection('stringing_applications')
    .aggregate([
      {
        $match: {
          'stringDetails.preferredDate': date,
          'stringDetails.preferredTime': { $type: 'string', $ne: '' },
          status: { $nin: EXCLUDED },
        },
      },
      { $group: { _id: '$stringDetails.preferredTime', count: { $sum: 1 } } },
      { $match: { count: { $gte: capacity } } },
      { $project: { _id: 0, time: '$_id' } },
      { $sort: { time: 1 } },
    ] as any[])
    .toArray();

  return rows.map((r: any) => String(r.time).trim()).filter(Boolean);
}

/**
 * 6) 한 번에 "해당 날짜의 슬롯 요약"을 계산해주는 헬퍼
 *  - /api/applications/stringing/reserved 에서 사용
 *  - 지금은 단일 슬롯 기준 capacity만 고려(멀티 슬롯 차단은 C안 2단계에서 확장)
 */
export async function buildSlotSummaryForDate(
  db: Db,
  date: string
): Promise<{
  date: string;
  capacity: number;
  allTimes: string[];
  reservedTimes: string[];
  availableTimes: string[];
}> {
  const settings = await loadStringingSettings(db);

  // 1) 예약 가능 기간 검증
  const win = validateBookingWindow(settings, date);
  if (!win.ok) {
    // 이 함수는 에러를 던지지 않고, 상위에서 메시지를 사용하게 하기 위해
    // 여기서는 단순한 "빈 요약"만 반환하도록 한다.
    // 실제 400 응답은 핸들러에서 처리.
    throw new Error(win.message || 'OUT_OF_WINDOW');
  }

  // 2) 날짜별 영업 설정 계산
  const schedule = resolveDaySchedule(settings, date);

  // 3) 슬롯 생성 (영업 안 하면 빈 배열)
  const allTimes = generateAllTimesForDay(schedule);

  // 4) 영업 안 하는 날이면 reserved/available 모두 빈 배열로 반환
  if (!schedule.isOpen || allTimes.length === 0) {
    return {
      date,
      capacity: schedule.capacity,
      allTimes: [],
      reservedTimes: [],
      availableTimes: [],
    };
  }

  // 5) 마감 시간 계산
  const reservedTimes = await findFullyBookedTimesWithSpan(db, date, schedule.capacity, allTimes);
  const availableTimes = allTimes.filter((t) => !reservedTimes.includes(t));

  return {
    date,
    capacity: schedule.capacity,
    allTimes,
    reservedTimes,
    availableTimes,
  };
}
