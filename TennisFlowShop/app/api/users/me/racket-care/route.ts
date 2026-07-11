import { getCurrentUserId } from "@/lib/hooks/get-current-user";
import { getDb } from "@/lib/mongodb";
import { findLatestCompletedApplication, normalizeRacketCareInput, RACKET_CARE_MAX_ITEMS, serializeRacketCareItem, summarizeCompletedApplication } from "@/lib/racket-care/server";
import type { RacketCareItemDoc } from "@/lib/racket-care/types";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function getUserObjectId() {
  const raw = await getCurrentUserId();
  return raw && ObjectId.isValid(raw) ? new ObjectId(raw) : null;
}

async function productAvailabilityById(db: any, ids: ObjectId[]) {
  if (ids.length === 0) return new Map<string, boolean>();
  const docs = await db.collection("products").find(
    { _id: { $in: ids } },
    { projection: { _id: 1, inventory: 1, mountingFee: 1 } },
  ).toArray();
  const map = new Map<string, boolean>();
  for (const doc of docs) {
    const inv = doc.inventory ?? {};
    const available = typeof doc.mountingFee === "number" && inv.status !== "outofstock" && (inv.manageStock !== true || Number(inv.stock ?? 0) > 0 || inv.allowBackorder === true);
    map.set(String(doc._id), available);
  }
  return map;
}

export async function GET() {
  const userId = await getUserObjectId();
  if (!userId) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  const db = await getDb();
  const items = (await db.collection<RacketCareItemDoc>("racket_care_items").find({ userId }).sort({ updatedAt: -1 }).toArray());
  const productIds = items.map((item) => item.lastStringProductId).filter((id): id is ObjectId => id instanceof ObjectId);
  const availability = await productAvailabilityById(db, productIds);
  const serialized = items.map((item) => serializeRacketCareItem(item, item.lastStringProductId ? availability.get(String(item.lastStringProductId)) ?? false : null));

  let suggestedImport = null;
  if (items.length === 0) {
    const user = await db.collection("users").findOne({ _id: userId }, { projection: { tennisProfile: 1 } });
    const profile = (user as any)?.tennisProfile ?? {};
    const brand = String(profile?.mainRacket?.brand ?? "").trim();
    const model = String(profile?.mainRacket?.model ?? "").trim();
    const latestCompletedApplication = await findLatestCompletedApplication(db, userId, [brand, model].filter(Boolean).join(" "));
    suggestedImport = brand || model || profile?.mainString || latestCompletedApplication ? {
      nickname: model || brand || "내 라켓",
      racket: { brand, model },
      playFrequency: "weekly",
      lastStringingAt: latestCompletedApplication?.completedAt ?? new Date().toISOString(),
      stringSnapshot: latestCompletedApplication?.stringSnapshot ?? {
        name: [profile?.mainString?.brand, profile?.mainString?.model].filter(Boolean).join(" ") || null,
        gauge: profile?.mainString?.gauge ?? null,
        tensionMain: profile?.mainString?.tensionMain ?? null,
        tensionCross: profile?.mainString?.tensionCross ?? null,
      },
      latestCompletedApplication,
    } : null;
  }

  return NextResponse.json({ items: serialized, suggestedImport });
}

export async function POST(req: Request) {
  const userId = await getUserObjectId();
  if (!userId) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  const db = await getDb();
  const count = await db.collection("racket_care_items").countDocuments({ userId });
  if (count >= RACKET_CARE_MAX_ITEMS) return NextResponse.json({ message: "라켓은 최대 5개까지 등록할 수 있습니다." }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const { value, errors } = normalizeRacketCareInput(body);
  if (Object.keys(errors).length) return NextResponse.json({ message: "입력값을 확인해 주세요.", errors }, { status: 400 });

  let lastApplicationId: ObjectId | null = null;
  let lastStringProductId: ObjectId | null = null;
  let stringSnapshot = value.stringSnapshot ?? null;
  const importId = String(body?.latestCompletedApplicationId ?? body?.lastApplicationId ?? "");
  if (ObjectId.isValid(importId)) {
    const importDoc = await db.collection("stringing_applications").findOne({ _id: new ObjectId(importId), userId });
    const imported = summarizeCompletedApplication(importDoc);
    if (imported) {
      lastApplicationId = new ObjectId(importId);
      stringSnapshot = imported.stringSnapshot;
      if (imported.productId && ObjectId.isValid(imported.productId)) lastStringProductId = new ObjectId(imported.productId);
    }
  }
  const now = new Date();
  const doc: RacketCareItemDoc = { _id: new ObjectId(), userId, nickname: value.nickname, racket: value.racket, playFrequency: value.playFrequency, lastStringingAt: value.lastStringingAt, lastApplicationId, lastStringProductId, stringSnapshot, reminderEnabled: Boolean(value.reminderEnabled), reminderSentFor: null, createdAt: now, updatedAt: now };
  await db.collection<RacketCareItemDoc>("racket_care_items").insertOne(doc);
  return NextResponse.json({ item: serializeRacketCareItem(doc) }, { status: 201 });
}
