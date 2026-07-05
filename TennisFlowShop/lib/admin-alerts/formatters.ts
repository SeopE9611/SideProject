export function formatWon(amount: unknown) {
  return `${Number(amount || 0).toLocaleString("ko-KR")}원`;
}

export function maskPhone(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length < 7) return "마스킹됨";
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

export function previewText(value: unknown, max = 80) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function compactId(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.length > 8 ? `…${text.slice(-8)}` : text;
}

export function truthyField(name: string, value: unknown) {
  const text = String(value ?? "").trim();
  return text ? { name, value: text } : null;
}

export function buildItemSummary(items: unknown) {
  if (!Array.isArray(items) || items.length === 0) return "";
  const picked = items.slice(0, 3).map((item: any) => {
    const name = item?.name || item?.productName || item?.racketName || item?.racketType || "상품";
    const qty = Number(item?.quantity ?? item?.qty ?? 1);
    const options = [item?.selectedGauge, item?.selectedColorLabel || item?.selectedColor]
      .filter(Boolean)
      .join(" / ");
    return `${name}${Number.isFinite(qty) && qty > 1 ? ` x${qty}` : ""}${options ? ` (${options})` : ""}`;
  });
  const rest = items.length - picked.length;
  return `${picked.join("\n")}${rest > 0 ? `\n외 ${rest}개` : ""}`;
}

export function formatOrderPickupLabel(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/visit|pickup|방문|매장/.test(text)) return "방문수령";
  if (/delivery|shipping|택배|배송/.test(text)) return "택배수령";
  return text;
}

export function formatRentalPeriod(days: unknown) {
  const n = Number(days);
  if ([7, 15, 30].includes(n)) return `${n}일`;
  const text = String(days ?? "").trim();
  return text ? `${text.replace(/일$/, "")}일` : "";
}

export function formatRentalPickupLabel(value: unknown) {
  return formatOrderPickupLabel(value);
}

export function buildRentalRacketName(doc: any) {
  return [doc?.brand, doc?.model].filter(Boolean).join(" ").trim();
}

export function buildRentalAmountSummary(amount: any, originalTotal: unknown, pointsUsed: unknown) {
  const lines = [
    `보증금 ${formatWon(amount?.deposit)}`,
    `대여료 ${formatWon(amount?.fee)}`,
    `스트링비 ${formatWon(amount?.stringPrice)}`,
    `장착비 ${formatWon(amount?.stringingFee)}`,
  ];
  const usedPoints = Number(pointsUsed ?? 0);
  if (Number.isFinite(usedPoints) && usedPoints > 0) {
    lines.push(`포인트 -${formatWon(usedPoints)}`);
    lines.push(`최종금액 ${formatWon(amount?.total ?? Number(originalTotal ?? 0) - usedPoints)}`);
  }
  return lines.join("\n");
}

export function formatCollectionMethod(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/visit|pickup|방문|매장/.test(text)) return "매장 방문 접수";
  if (/delivery|shipping|택배|발송/.test(text)) return "자가 발송(택배)";
  return text;
}

export function formatVisitReservation(
  date: unknown,
  time: unknown,
  durationMinutes?: unknown,
  slotCount?: unknown,
) {
  const d = String(date ?? "").trim();
  const t = String(time ?? "").trim();
  if (!d || !t) return "예약 일시 미입력";
  const duration = Number(durationMinutes || 30);
  const slots = Number(slotCount || 1);
  const end = addMinutesToTime(t, duration);
  return `${d} ${t}${end ? ` ~ ${end}` : ""} (${Number.isFinite(slots) ? slots : 1}슬롯 / 총 ${Number.isFinite(duration) ? duration : 30}분)`;
}

function addMinutesToTime(time: string, minutes: number) {
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!match || !Number.isFinite(minutes)) return "";
  const total = Number(match[1]) * 60 + Number(match[2]) + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
