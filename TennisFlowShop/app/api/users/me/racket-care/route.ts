import { getCurrentUserId } from "@/lib/hooks/get-current-user";
import { getDb } from "@/lib/mongodb";
import { COMPLETED_STRINGING_APPLICATION_STATUSES } from "@/lib/racket-care/application-status";
import {
  dedupeImportCandidates,
  findLatestCompletedApplication,
  normalizeRacketCareInput,
  RACKET_CARE_MAX_ITEMS,
  serializeRacketCareItem,
  summarizeCompletedApplication,
  type RacketCareImportCandidate,
} from "@/lib/racket-care/server";
import type { RacketCareItemDoc } from "@/lib/racket-care/types";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function getUserObjectId() {
  const raw = await getCurrentUserId();
  return raw && ObjectId.isValid(raw) ? new ObjectId(raw) : null;
}

async function productAvailabilityById(db: Awaited<ReturnType<typeof getDb>>, ids: ObjectId[]) {
  if (ids.length === 0) return new Map<string, boolean>();
  const docs = await db
    .collection("products")
    .find({ _id: { $in: ids } }, { projection: { _id: 1, inventory: 1, mountingFee: 1 } })
    .toArray();
  const map = new Map<string, boolean>();
  for (const doc of docs) {
    const inv = doc.inventory ?? {};
    const available =
      typeof doc.mountingFee === "number" &&
      inv.status !== "outofstock" &&
      (inv.manageStock !== true || Number(inv.stock ?? 0) > 0 || inv.allowBackorder === true);
    map.set(String(doc._id), available);
  }
  return map;
}

export async function GET() {
  const userId = await getUserObjectId();
  if (!userId) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  const db = await getDb();
  const items = await db
    .collection<RacketCareItemDoc>("racket_care_items")
    .find({ userId })
    .sort({ updatedAt: -1 })
    .toArray();
  const productIds = items
    .map((item) => item.lastStringProductId)
    .filter((id): id is ObjectId => id instanceof ObjectId);
  const availability = await productAvailabilityById(db, productIds);
  const serialized = items.map((item) =>
    serializeRacketCareItem(
      item,
      item.lastStringProductId
        ? (availability.get(String(item.lastStringProductId)) ?? false)
        : null,
    ),
  );

  const profile = await db
    .collection("player_profiles")
    .findOne({ userId }, { projection: { level: 1, mainRacket: 1, mainString: 1 } });
  const importCandidates: RacketCareImportCandidate[] = [];
  const profileRacket =
    profile?.mainRacket && typeof profile.mainRacket === "object"
      ? (profile.mainRacket as Record<string, unknown>)
      : null;
  const profileString =
    profile?.mainString && typeof profile.mainString === "object"
      ? (profile.mainString as Record<string, unknown>)
      : null;
  const brand = String(profileRacket?.brand ?? "").trim();
  const model = String(profileRacket?.model ?? "").trim();
  const profileStringName = [profileString?.brand, profileString?.model]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ");
  const latestCompletedApplication = await findLatestCompletedApplication(
    db,
    userId,
    [brand, model].filter(Boolean).join(" "),
  );
  if (brand || model || profileStringName) {
    importCandidates.push({
      id: "profile",
      source: "profile",
      sourceLabel: "테니스 프로필",
      nickname: model || brand || "내 라켓",
      racket: { brand, model },
      playFrequency: "weekly",
      lastStringingAt: latestCompletedApplication?.completedAt ?? null,
      stringSnapshot: latestCompletedApplication?.stringSnapshot ?? {
        name: profileStringName || null,
        gauge: String(profileString?.gauge ?? "") || null,
        tensionMain: String(profileString?.tensionMain ?? "") || null,
        tensionCross: String(profileString?.tensionCross ?? "") || null,
      },
      latestCompletedApplication,
    });
  }

  const recentApplications = await db
    .collection("stringing_applications")
    .find(
      { userId, status: { $in: COMPLETED_STRINGING_APPLICATION_STATUSES } },
      { sort: { updatedAt: -1, createdAt: -1 }, limit: 30 },
    )
    .toArray();
  for (const app of recentApplications) {
    const imported = summarizeCompletedApplication(app);
    if (!imported) continue;
    const racketName = String(imported.racketName ?? "").trim();
    const [appBrand, ...appModelParts] = racketName.split(/\s+/).filter(Boolean);
    importCandidates.push({
      id: `application:${imported.id}`,
      source: "application",
      sourceLabel: "완료된 교체 이력",
      nickname: racketName || imported.stringSnapshot.name || "교체 이력 라켓",
      racket: { brand: appBrand ?? "", model: appModelParts.join(" ") || racketName || "라켓" },
      playFrequency: "weekly",
      lastStringingAt: imported.completedAt,
      stringSnapshot: imported.stringSnapshot,
      latestCompletedApplication: imported,
    });
  }
  const cleanedImportCandidates = dedupeImportCandidates(importCandidates).slice(0, 8);
  const suggestedImport = cleanedImportCandidates[0] ?? null;
  const remainingSlots = Math.max(0, RACKET_CARE_MAX_ITEMS - items.length);
  const profileLevel = String(profile?.level ?? "");

  return NextResponse.json({
    items: serialized,
    importCandidates: cleanedImportCandidates,
    suggestedImport,
    maxItems: RACKET_CARE_MAX_ITEMS,
    remainingSlots,
    profileLevel,
  });
}

export async function POST(req: Request) {
  const userId = await getUserObjectId();
  if (!userId) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  const db = await getDb();
  const count = await db.collection("racket_care_items").countDocuments({ userId });
  if (count >= RACKET_CARE_MAX_ITEMS)
    return NextResponse.json(
      { message: "라켓은 최대 5개까지 등록할 수 있습니다." },
      { status: 400 },
    );
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const { value, errors } = normalizeRacketCareInput(body);
  if (Object.keys(errors).length)
    return NextResponse.json({ message: "입력값을 확인해 주세요.", errors }, { status: 400 });

  let lastApplicationId: ObjectId | null = null;
  let lastStringProductId: ObjectId | null = null;
  let stringSnapshot = value.stringSnapshot ?? null;
  const importId = String(body.latestCompletedApplicationId ?? body.lastApplicationId ?? "");
  if (ObjectId.isValid(importId)) {
    const importDoc = await db
      .collection("stringing_applications")
      .findOne({ _id: new ObjectId(importId), userId });
    const imported = summarizeCompletedApplication(importDoc);
    if (imported) {
      lastApplicationId = new ObjectId(importId);
      stringSnapshot = imported.stringSnapshot;
      if (imported.productId && ObjectId.isValid(imported.productId))
        lastStringProductId = new ObjectId(imported.productId);
    }
  }
  const now = new Date();
  const doc: RacketCareItemDoc = {
    _id: new ObjectId(),
    userId,
    nickname: value.nickname,
    racket: value.racket,
    playFrequency: value.playFrequency,
    lastStringingAt: value.lastStringingAt,
    lastApplicationId,
    lastStringProductId,
    stringSnapshot,
    reminderEnabled: Boolean(value.reminderEnabled),
    reminderSentFor: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<RacketCareItemDoc>("racket_care_items").insertOne(doc);
  return NextResponse.json({ item: serializeRacketCareItem(doc) }, { status: 201 });
}
