import { calculateRacketCareStatus } from "@/lib/racket-care/calculate-care-status";
import { COMPLETED_STRINGING_APPLICATION_STATUSES, isCompletedStringingApplicationStatus } from "@/lib/racket-care/application-status";
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

type NormalizedRacketCareCreateInput = Pick<RacketCareItemDoc, "nickname" | "racket" | "playFrequency" | "lastStringingAt"> & Partial<Pick<RacketCareItemDoc, "reminderEnabled" | "stringSnapshot">>;
type NormalizedRacketCarePatchInput = Partial<Pick<RacketCareItemDoc, "nickname" | "racket" | "playFrequency" | "lastStringingAt" | "reminderEnabled" | "stringSnapshot">>;

export function normalizeRacketCareInput(input: Record<string, unknown>, partial: true): { value: NormalizedRacketCarePatchInput; errors: Record<string, string> };
export function normalizeRacketCareInput(input: Record<string, unknown>, partial?: false): { value: NormalizedRacketCareCreateInput; errors: Record<string, string> };
export function normalizeRacketCareInput(input: Record<string, unknown>, partial = false) {
  const errors: Record<string, string> = {};
  const out: Partial<RacketCareItemDoc> & { racket?: { brand: string; model: string } } = {};
  if (!partial || "nickname" in input) {
    out.nickname = trimLimit(input?.nickname, 40);
    if (!out.nickname) errors.nickname = "라켓 별칭을 입력해 주세요.";
  }
  if (!partial || "racket" in input || "brand" in input) {
    out.racket = {
      brand: trimLimit(typeof input?.racket === "object" && input.racket ? (input.racket as Record<string, unknown>).brand : input?.brand, 40),
      model: trimLimit(typeof input?.racket === "object" && input.racket ? (input.racket as Record<string, unknown>).model : input?.model, 60),
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
      name: trimLimit(typeof input.stringSnapshot === "object" && input.stringSnapshot ? (input.stringSnapshot as Record<string, unknown>).name : null, 80) || null,
      gauge: trimLimit(typeof input.stringSnapshot === "object" && input.stringSnapshot ? (input.stringSnapshot as Record<string, unknown>).gauge : null, 30) || null,
      tensionMain: trimLimit(typeof input.stringSnapshot === "object" && input.stringSnapshot ? (input.stringSnapshot as Record<string, unknown>).tensionMain : null, 10) || null,
      tensionCross: trimLimit(typeof input.stringSnapshot === "object" && input.stringSnapshot ? (input.stringSnapshot as Record<string, unknown>).tensionCross : null, 10) || null,
    };
  }
  if (!partial && !out.nickname) errors.nickname = errors.nickname ?? "라켓 별칭을 입력해 주세요.";
  if (!partial && !out.racket) {
    errors.brand = errors.brand ?? "브랜드를 입력해 주세요.";
    errors.model = errors.model ?? "모델명을 입력해 주세요.";
  }
  if (!partial && !out.playFrequency) errors.playFrequency = errors.playFrequency ?? "플레이 빈도를 선택해 주세요.";
  if (!partial && !out.lastStringingAt) errors.lastStringingAt = errors.lastStringingAt ?? "마지막 교체일을 입력해 주세요.";
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


export function summarizeCompletedApplication(doc: Record<string, unknown> | null | undefined) {
  if (!doc || !isCompletedStringingApplicationStatus(doc.status)) return null;
  const stringItems = Array.isArray(doc.stringItems) ? doc.stringItems : [];
  const item = stringItems[0] && typeof stringItems[0] === "object" ? stringItems[0] as Record<string, unknown> : null;
  const stringDetails = doc.stringDetails && typeof doc.stringDetails === "object" ? doc.stringDetails as Record<string, unknown> : null;
  const detailLines = Array.isArray(stringDetails?.lines) ? stringDetails.lines : [];
  const firstLine = detailLines[0] && typeof detailLines[0] === "object" ? detailLines[0] as Record<string, unknown> : null;
  const meta = doc.meta && typeof doc.meta === "object" ? doc.meta as Record<string, unknown> : null;
  const selectedString = doc.selectedString && typeof doc.selectedString === "object" ? doc.selectedString as Record<string, unknown> : null;
  const productIdRaw = item?.productId ?? selectedString?.productId ?? doc.selectedStringProductId;
  const productId = ObjectId.isValid(String(productIdRaw ?? "")) ? String(productIdRaw) : null;
  const mountingInfo = doc.mountingInfo && typeof doc.mountingInfo === "object" ? doc.mountingInfo as Record<string, unknown> : null;
  const lines = Array.isArray(doc.lines) ? doc.lines : [];
  const firstLegacyLine = lines[0] && typeof lines[0] === "object" ? lines[0] as Record<string, unknown> : null;
  const tensionMain = doc.tensionMain ?? mountingInfo?.tensionMain ?? firstLine?.tensionMain ?? firstLegacyLine?.tensionMain ?? null;
  const tensionCross = doc.tensionCross ?? mountingInfo?.tensionCross ?? firstLine?.tensionCross ?? firstLegacyLine?.tensionCross ?? null;
  const completedHistory = Array.isArray(doc.history)
    ? doc.history.find((entry): entry is Record<string, unknown> => entry && typeof entry === "object" && isCompletedStringingApplicationStatus((entry as Record<string, unknown>).status))
    : null;
  const completedAtRaw = doc.completedAt ?? doc.completedDate ?? completedHistory?.date ?? doc.updatedAt ?? doc.createdAt;
  const completedAt = completedAtRaw instanceof Date ? completedAtRaw : new Date(String(completedAtRaw ?? ""));
  return {
    id: String(doc._id),
    racketName: doc.racketType ?? firstLine?.racketName ?? firstLine?.racketType ?? firstLegacyLine?.racketType ?? null,
    completedAt: Number.isNaN(completedAt.getTime()) ? null : completedAt.toISOString(),
    productId,
    stringSnapshot: {
      name: item?.name ?? firstLine?.stringName ?? doc.selectedStringName ?? selectedString?.name ?? null,
      gauge: firstLine?.gauge ?? doc.selectedGauge ?? meta?.selectedGauge ?? doc.stringGauge ?? null,
      tensionMain: tensionMain ? String(tensionMain) : null,
      tensionCross: tensionCross ? String(tensionCross) : null,
    },
  };
}

export async function findLatestCompletedApplication(db: Db, userId: ObjectId, racketName?: string) {
  const filter: Record<string, unknown> = { userId, status: { $in: COMPLETED_STRINGING_APPLICATION_STATUSES } };
  const name = String(racketName ?? "").trim();
  if (name) filter.$or = [{ racketType: name }, { "racket.racketType": name }, { "lines.racketType": name }];
  const doc = await db.collection("stringing_applications").findOne(filter, { sort: { updatedAt: -1, createdAt: -1 } });
  return summarizeCompletedApplication(doc);
}


export type RacketCareImportCandidate = {
  id: string;
  source: "profile" | "application";
  sourceLabel: string;
  nickname: string;
  racket: { brand: string; model: string };
  playFrequency: RacketCarePlayFrequency;
  lastStringingAt: string | null;
  stringSnapshot: { name?: string | null; gauge?: string | null; tensionMain?: string | null; tensionCross?: string | null } | null;
  latestCompletedApplication?: ReturnType<typeof summarizeCompletedApplication>;
};

export function dedupeImportCandidates(candidates: RacketCareImportCandidate[]) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = candidate.latestCompletedApplication?.id
      ? `application:${candidate.latestCompletedApplication.id}`
      : ["profile", candidate.racket.brand, candidate.racket.model, candidate.stringSnapshot?.name ?? "", candidate.lastStringingAt?.slice(0, 10) ?? ""].join(":").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
