import { calculateRacketCareStatus } from "@/lib/racket-care/calculate-care-status";
import { isCompletedStringingApplicationStatus } from "@/lib/racket-care/application-status";
import type { RacketCareItemDoc, RacketCarePlayFrequency } from "@/lib/racket-care/types";
import { ObjectId, type Db } from "mongodb";

export const RACKET_CARE_MAX_ITEMS = 5;
const VALID_FREQ = new Set<RacketCarePlayFrequency>(["monthly", "weekly", "biweekly_plus", "heavy"]);

function trimLimit(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export function isRacketCarePlayFrequency(value: unknown): value is RacketCarePlayFrequency {
  return VALID_FREQ.has(value as RacketCarePlayFrequency);
}

export function normalizeRacketCareInput(input: any, partial = false) {
  const errors: Record<string, string> = {};
  const out: any = {};
  if (!partial || "nickname" in input) {
    out.nickname = trimLimit(input?.nickname, 40);
    if (!out.nickname) errors.nickname = "라켓 별칭을 입력해 주세요.";
  }
  if (!partial || "racket" in input || "brand" in input) {
    out.racket = {
      brand: trimLimit(input?.racket?.brand ?? input?.brand, 40),
      model: trimLimit(input?.racket?.model ?? input?.model, 60),
    };
    if (!out.racket.brand) errors.brand = "브랜드를 입력해 주세요.";
    if (!out.racket.model) errors.model = "모델명을 입력해 주세요.";
  }
  if (!partial || "playFrequency" in input) {
    if (isRacketCarePlayFrequency(input?.playFrequency)) out.playFrequency = input.playFrequency;
    else errors.playFrequency = "플레이 빈도를 선택해 주세요.";
  }
  if (!partial || "lastStringingAt" in input) {
    const date = new Date(String(input?.lastStringingAt ?? ""));
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    if (Number.isNaN(date.getTime())) errors.lastStringingAt = "마지막 교체일을 입력해 주세요.";
    else if (date > todayEnd) errors.lastStringingAt = "미래 날짜는 선택할 수 없습니다.";
    else out.lastStringingAt = date;
  }
  if ("reminderEnabled" in input) out.reminderEnabled = Boolean(input.reminderEnabled);
  if ("stringSnapshot" in input) {
    out.stringSnapshot = {
      name: trimLimit(input.stringSnapshot?.name, 80) || null,
      gauge: trimLimit(input.stringSnapshot?.gauge, 30) || null,
      tensionMain: trimLimit(input.stringSnapshot?.tensionMain, 10) || null,
      tensionCross: trimLimit(input.stringSnapshot?.tensionCross, 10) || null,
    };
  }
  return { value: out, errors };
}

export function serializeRacketCareItem(doc: RacketCareItemDoc, productAvailable: boolean | null = null) {
  return {
    id: doc._id.toString(),
    nickname: doc.nickname,
    racket: doc.racket,
    playFrequency: doc.playFrequency,
    lastStringingAt: doc.lastStringingAt.toISOString(),
    lastApplicationId: doc.lastApplicationId ? doc.lastApplicationId.toString() : null,
    lastStringProductId: doc.lastStringProductId ? doc.lastStringProductId.toString() : null,
    stringSnapshot: doc.stringSnapshot ?? null,
    reminderEnabled: doc.reminderEnabled,
    careStatus: calculateRacketCareStatus({ playFrequency: doc.playFrequency, lastStringingAt: doc.lastStringingAt }),
    recentStringProductAvailable: productAvailable,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}


export function summarizeCompletedApplication(doc: any) {
  if (!doc || !isCompletedStringingApplicationStatus(doc.status)) return null;
  const item = Array.isArray(doc.stringItems) ? doc.stringItems[0] : null;
  const productIdRaw = item?.productId ?? doc.selectedString?.productId ?? doc.selectedStringProductId;
  const productId = ObjectId.isValid(String(productIdRaw ?? "")) ? String(productIdRaw) : null;
  const tensionMain = doc.tensionMain ?? doc.mountingInfo?.tensionMain ?? doc.lines?.[0]?.tensionMain ?? null;
  const tensionCross = doc.tensionCross ?? doc.mountingInfo?.tensionCross ?? doc.lines?.[0]?.tensionCross ?? null;
  return {
    id: String(doc._id),
    racketName: doc.racketType ?? doc.racket?.racketType ?? doc.lines?.[0]?.racketType ?? null,
    completedAt: (doc.updatedAt instanceof Date ? doc.updatedAt : doc.createdAt instanceof Date ? doc.createdAt : new Date()).toISOString(),
    productId,
    stringSnapshot: {
      name: item?.name ?? doc.selectedStringName ?? doc.selectedString?.name ?? null,
      gauge: doc.selectedGauge ?? doc.stringGauge ?? null,
      tensionMain: tensionMain ? String(tensionMain) : null,
      tensionCross: tensionCross ? String(tensionCross) : null,
    },
  };
}

export async function findLatestCompletedApplication(db: Db, userId: ObjectId, racketName?: string) {
  const filter: any = { userId, status: { $in: ["completed", "교체완료", "done", "work_done"] } };
  const name = String(racketName ?? "").trim();
  if (name) filter.$or = [{ racketType: name }, { "racket.racketType": name }, { "lines.racketType": name }];
  const doc = await db.collection("stringing_applications").findOne(filter, { sort: { updatedAt: -1, createdAt: -1 } });
  return summarizeCompletedApplication(doc);
}
