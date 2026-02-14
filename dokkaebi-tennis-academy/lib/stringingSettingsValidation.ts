export type ExceptionItem = {
  date: string;
  closed?: boolean;
  start?: string;
  end?: string;
  interval?: number;
  capacity?: number;
};

export type BaseStringingSettings = {
  capacity: number;
  start: string;
  end: string;
  interval: number;
  bookingWindowDays: number;
};

const INTERVAL_MIN = 5;
const INTERVAL_MAX = 240;
const CAPACITY_MIN = 1;
const CAPACITY_MAX = 10;
const BOOKING_WINDOW_MIN = 1;
const BOOKING_WINDOW_MAX = 180;

const HHMM_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const isValidHHMM = (value: string) => HHMM_REGEX.test(value);
const isValidDate = (value: string) => DATE_REGEX.test(value);

const toMinutes = (hhmm: string) => {
  const [hour, minute] = hhmm.split(':').map(Number);
  return hour * 60 + minute;
};

const hasAtLeastOneSlot = (start: string, end: string, step: number) => toMinutes(end) - toMinutes(start) >= step;

export function validateBaseSettings(settings: BaseStringingSettings): string | null {
  if (!isValidHHMM(settings.start) || !isValidHHMM(settings.end)) {
    return '영업 시작/종료 시각 형식이 올바르지 않습니다.';
  }

  if (toMinutes(settings.start) >= toMinutes(settings.end)) {
    return '영업 시작 시각은 종료 시각보다 이른 시간이어야 합니다.';
  }

  if (!Number.isInteger(settings.interval) || settings.interval < INTERVAL_MIN || settings.interval > INTERVAL_MAX) {
    return `간격은 ${INTERVAL_MIN}~${INTERVAL_MAX}분 범위여야 합니다.`;
  }

  if (!hasAtLeastOneSlot(settings.start, settings.end, settings.interval)) {
    return '간격이 너무 큽니다. 최소 1개 이상의 슬롯이 생성되어야 합니다.';
  }

  if (!Number.isInteger(settings.capacity) || settings.capacity < CAPACITY_MIN || settings.capacity > CAPACITY_MAX) {
    return `동시 수용량은 ${CAPACITY_MIN}~${CAPACITY_MAX}명 범위여야 합니다.`;
  }

  if (!Number.isInteger(settings.bookingWindowDays) || settings.bookingWindowDays < BOOKING_WINDOW_MIN || settings.bookingWindowDays > BOOKING_WINDOW_MAX) {
    return `예약 가능 기간은 ${BOOKING_WINDOW_MIN}~${BOOKING_WINDOW_MAX}일 범위로 설정해주세요.`;
  }

  return null;
}

export function sanitizeExceptionInput(exception: ExceptionItem): ExceptionItem {
  if (!exception.closed) return { ...exception };

  return {
    date: exception.date,
    closed: true,
    start: undefined,
    end: undefined,
    interval: undefined,
    capacity: undefined,
  };
}

export function validateExceptionItem(exception: ExceptionItem): string | null {
  if (!isValidDate(exception.date)) {
    return '예외일 날짜 형식이 올바르지 않습니다.';
  }

  if (exception.closed) return null;

  const hasStart = Boolean(exception.start);
  const hasEnd = Boolean(exception.end);

  if (hasStart !== hasEnd) {
    return `[예외일 ${exception.date}] 시작/종료 시각을 모두 입력해주세요.`;
  }

  if (hasStart && hasEnd) {
    if (!isValidHHMM(exception.start!) || !isValidHHMM(exception.end!)) {
      return `[예외일 ${exception.date}] 시작/종료 시각 형식이 올바르지 않습니다.`;
    }

    if (toMinutes(exception.start!) >= toMinutes(exception.end!)) {
      return `[예외일 ${exception.date}] 시작/종료 시각이 올바르지 않습니다.`;
    }

    if (typeof exception.interval === 'number' && !hasAtLeastOneSlot(exception.start!, exception.end!, exception.interval)) {
      return `[예외일 ${exception.date}] 간격이 너무 큽니다. 슬롯이 1개 이상 생성되어야 합니다.`;
    }
  }

  if (typeof exception.interval === 'number') {
    if (!Number.isInteger(exception.interval) || exception.interval < INTERVAL_MIN || exception.interval > INTERVAL_MAX) {
      return `[예외일 ${exception.date}] 간격은 ${INTERVAL_MIN}~${INTERVAL_MAX}분 범위여야 합니다.`;
    }
  }

  if (typeof exception.capacity === 'number') {
    if (!Number.isInteger(exception.capacity) || exception.capacity < CAPACITY_MIN || exception.capacity > CAPACITY_MAX) {
      return `[예외일 ${exception.date}] 수용량은 ${CAPACITY_MIN}~${CAPACITY_MAX}명 범위여야 합니다.`;
    }
  }

  return null;
}
