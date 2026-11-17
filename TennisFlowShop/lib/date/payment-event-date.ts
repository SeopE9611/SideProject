const EVENT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2})$/;

export function parsePaymentEventDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value !== "string" || !EVENT_DATE_PATTERN.test(value)) return null;
  const [year, month, day, hour, minute, second] = value.slice(0, 19).split(/[-T:]/).map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59) return null;
  const normalized = value.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const date = new Date(normalized);
  return Number.isFinite(date.getTime()) ? date : null;
}

// MongoDB에서도 명시적 시간대만 허용하고 +0900을 +09:00으로 바꾼 뒤 변환한다.
export function mongoPaymentEventDate(input: unknown) {
  const length = { $strLenBytes: "$$value" };
  return { $let: { vars: { value: input }, in: { $switch: {
    branches: [
      { case: { $eq: [{ $type: "$$value" }, "date"] }, then: "$$value" },
      { case: { $eq: [{ $type: "$$value" }, "string"] }, then: { $cond: [
        { $regexMatch: { input: "$$value", regex: EVENT_DATE_PATTERN } },
        { $convert: { input: { $cond: [
          { $regexMatch: { input: "$$value", regex: /[+-]\d{4}$/ } },
          { $concat: [{ $substrBytes: ["$$value", 0, { $subtract: [length, 2] }] }, ":", { $substrBytes: ["$$value", { $subtract: [length, 2] }, 2] }] },
          "$$value",
        ] }, to: "date", onError: null, onNull: null } },
        null,
      ] } },
    ], default: null,
  } } } };
}
