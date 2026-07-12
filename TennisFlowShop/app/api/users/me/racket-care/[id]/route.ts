import { getCurrentUserId } from "@/lib/hooks/get-current-user";
import { getDb } from "@/lib/mongodb";
import { normalizeRacketCareInput, serializeRacketCareItem, summarizeCompletedApplication } from "@/lib/racket-care/server";
import type { RacketCareItemDoc } from "@/lib/racket-care/types";
import { ObjectId } from "mongodb";
import { isCompletedStringingApplicationStatus } from "@/lib/racket-care/application-status";
import { NextResponse } from "next/server";

async function getIds(id: string) {
  const raw = await getCurrentUserId();
  if (!raw || !ObjectId.isValid(raw) || !ObjectId.isValid(id)) return null;
  return { userId: new ObjectId(raw), itemId: new ObjectId(id) };
}

function sameOptionalText(a: unknown, b: unknown) {
  const normalize = (value: unknown) => {
    const text = String(value ?? "").trim();
    return text || null;
  };
  return normalize(a) === normalize(b);
}

function sameStringSnapshot(a: RacketCareItemDoc["stringSnapshot"], b: RacketCareItemDoc["stringSnapshot"]) {
  return sameOptionalText(a?.name, b?.name) && sameOptionalText(a?.gauge, b?.gauge) && sameOptionalText(a?.tensionMain, b?.tensionMain) && sameOptionalText(a?.tensionCross, b?.tensionCross);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ids = await getIds(id);
  if (!ids) return NextResponse.json({ message: "요청을 처리할 수 없습니다." }, { status: 401 });
  const db = await getDb();
  const item = await db.collection<RacketCareItemDoc>("racket_care_items").findOne({ _id: ids.itemId, userId: ids.userId });
  if (!item) return NextResponse.json({ message: "라켓 정보를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ item: serializeRacketCareItem(item) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ids = await getIds(id);
  if (!ids) return NextResponse.json({ message: "요청을 처리할 수 없습니다." }, { status: 401 });
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const latestCompletedApplicationId = typeof body.latestCompletedApplicationId === "string" ? body.latestCompletedApplicationId.trim() : undefined;
  const clearCompletedApplicationLink = body.clearCompletedApplicationLink === true;
  if (latestCompletedApplicationId && clearCompletedApplicationLink) return NextResponse.json({ message: "완료 이력 연결 방식을 확인해 주세요.", errors: { latestCompletedApplicationId: "완료 이력 연결 방식을 확인해 주세요." } }, { status: 400 });
  const { value, errors } = normalizeRacketCareInput(body, true);
  if (Object.keys(errors).length) return NextResponse.json({ message: "입력값을 확인해 주세요.", errors }, { status: 400 });
  const db = await getDb();
  const current = await db.collection<RacketCareItemDoc>("racket_care_items").findOne({ _id: ids.itemId, userId: ids.userId });
  if (!current) return NextResponse.json({ message: "라켓 정보를 찾을 수 없습니다." }, { status: 404 });
  const $set: Partial<RacketCareItemDoc> = { updatedAt: new Date() };
  if (value.nickname !== undefined) $set.nickname = value.nickname;
  if (value.racket !== undefined) $set.racket = value.racket;
  if (value.playFrequency !== undefined) $set.playFrequency = value.playFrequency;
  if (value.lastStringingAt !== undefined) $set.lastStringingAt = value.lastStringingAt;
  if (value.stringSnapshot !== undefined) $set.stringSnapshot = value.stringSnapshot;
  if (value.reminderEnabled !== undefined) $set.reminderEnabled = value.reminderEnabled;

  const invalidCompletedHistory = () => NextResponse.json({ message: "입력값을 확인해 주세요.", errors: { latestCompletedApplicationId: "완료된 교체 이력을 다시 선택해 주세요." } }, { status: 400 });
  if (latestCompletedApplicationId) {
    if (!ObjectId.isValid(latestCompletedApplicationId)) return invalidCompletedHistory();
    const application = await db.collection("stringing_applications").findOne({ _id: new ObjectId(latestCompletedApplicationId), userId: ids.userId });
    if (!application || !isCompletedStringingApplicationStatus(application.status)) return invalidCompletedHistory();
    const imported = summarizeCompletedApplication(application);
    if (!imported?.completedAt) return invalidCompletedHistory();
    $set.lastApplicationId = new ObjectId(latestCompletedApplicationId);
    $set.lastStringProductId = imported.productId && ObjectId.isValid(imported.productId) ? new ObjectId(imported.productId) : null;
    $set.stringSnapshot = imported.stringSnapshot;
    $set.lastStringingAt = new Date(imported.completedAt);
    $set.reminderSentFor = null;
  } else if (clearCompletedApplicationLink) {
    $set.lastApplicationId = null;
    $set.lastStringProductId = null;
  } else if (current.lastApplicationId) {
    const dateChanged = value.lastStringingAt instanceof Date && value.lastStringingAt.getTime() !== current.lastStringingAt.getTime();
    const snapshotChanged = value.stringSnapshot !== undefined && !sameStringSnapshot(value.stringSnapshot, current.stringSnapshot);
    if (dateChanged || snapshotChanged) {
      $set.lastApplicationId = null;
      $set.lastStringProductId = null;
    }
  }

  if (("reminderEnabled" in value && value.reminderEnabled && !current.reminderEnabled) || ("lastStringingAt" in $set && $set.lastStringingAt instanceof Date && $set.lastStringingAt.getTime() !== current.lastStringingAt.getTime())) $set.reminderSentFor = null;
  const updated = await db.collection<RacketCareItemDoc>("racket_care_items").findOneAndUpdate({ _id: ids.itemId, userId: ids.userId }, { $set }, { returnDocument: "after" });
  return NextResponse.json({ item: serializeRacketCareItem(updated as RacketCareItemDoc) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ids = await getIds(id);
  if (!ids) return NextResponse.json({ message: "요청을 처리할 수 없습니다." }, { status: 401 });
  const db = await getDb();
  const res = await db.collection("racket_care_items").deleteOne({ _id: ids.itemId, userId: ids.userId });
  if (!res.deletedCount) return NextResponse.json({ message: "라켓 정보를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
