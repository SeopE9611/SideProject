import { getCurrentUserId } from "@/lib/hooks/get-current-user";
import { getDb } from "@/lib/mongodb";
import { normalizeRacketCareInput, serializeRacketCareItem } from "@/lib/racket-care/server";
import type { RacketCareItemDoc } from "@/lib/racket-care/types";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

async function getIds(id: string) {
  const raw = await getCurrentUserId();
  if (!raw || !ObjectId.isValid(raw) || !ObjectId.isValid(id)) return null;
  return { userId: new ObjectId(raw), itemId: new ObjectId(id) };
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
  const { value, errors } = normalizeRacketCareInput(body, true);
  if (Object.keys(errors).length) return NextResponse.json({ message: "입력값을 확인해 주세요.", errors }, { status: 400 });
  const db = await getDb();
  const current = await db.collection<RacketCareItemDoc>("racket_care_items").findOne({ _id: ids.itemId, userId: ids.userId });
  if (!current) return NextResponse.json({ message: "라켓 정보를 찾을 수 없습니다." }, { status: 404 });
  const $set: Partial<RacketCareItemDoc> = { updatedAt: new Date() };
  for (const key of ["nickname", "racket", "playFrequency", "lastStringingAt", "stringSnapshot", "reminderEnabled"] as const) if (key in value) $set[key] = value[key];
  if (("reminderEnabled" in value && value.reminderEnabled && !current.reminderEnabled) || ("lastStringingAt" in value && value.lastStringingAt instanceof Date && value.lastStringingAt.getTime() !== current.lastStringingAt.getTime())) $set.reminderSentFor = null;
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
