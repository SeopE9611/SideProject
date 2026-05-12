import { NextResponse } from "next/server";
import { ObjectId, type Document } from "mongodb";

import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { requireAdmin } from "@/lib/admin.guard";
import {
  isAcademyClassLevel,
  isAcademyClassLessonType,
  isAcademyClassStatus,
} from "@/lib/types/academy";

const COLLECTION_NAME = "academy_classes";

type ClassPayload = {
  name: string;
  description: string | null;
  level: string;
  lessonType: string;
  instructorName: string | null;
  location: string | null;
  scheduleText: string | null;
  capacity: number | null;
  price: number | null;
  status: string;
};

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object" && "toHexString" in value) {
    const maybeObjectId = value as { toHexString?: () => string };
    if (typeof maybeObjectId.toHexString === "function") {
      return maybeObjectId.toHexString();
    }
  }
  return value;
}

function serializeClass(doc: Document) {
  return {
    _id: String(serializeValue(doc._id)),
    name: typeof doc.name === "string" ? doc.name : "",
    description: typeof doc.description === "string" ? doc.description : null,
    level: typeof doc.level === "string" ? doc.level : "all",
    lessonType: typeof doc.lessonType === "string" ? doc.lessonType : "group",
    instructorName:
      typeof doc.instructorName === "string" ? doc.instructorName : null,
    location: typeof doc.location === "string" ? doc.location : null,
    scheduleText: typeof doc.scheduleText === "string" ? doc.scheduleText : null,
    capacity: typeof doc.capacity === "number" ? doc.capacity : null,
    enrolledCount:
      typeof doc.enrolledCount === "number" ? doc.enrolledCount : 0,
    price: typeof doc.price === "number" ? doc.price : null,
    status: typeof doc.status === "string" ? doc.status : "draft",
    createdAt: serializeValue(doc.createdAt) ?? null,
    updatedAt: serializeValue(doc.updatedAt) ?? null,
  };
}

function normalizeOptionalText(value: unknown, maxLength: number) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function parseOptionalNonNegativeNumber(
  value: unknown,
  fieldLabel: string,
): { value: number | null } | { error: string } {
  if (value === null || value === undefined || value === "") return { value: null };
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return { error: `${fieldLabel}은 0 이상의 숫자로 입력해 주세요.` };
  }
  return { value: Math.trunc(numeric) };
}

function validateClassPayload(payload: Record<string, unknown>):
  | { ok: true; value: ClassPayload }
  | { ok: false; message: string } {
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (!name) return { ok: false, message: "클래스명을 입력해 주세요." };
  if (name.length > 80) {
    return { ok: false, message: "클래스명은 80자 이하로 입력해 주세요." };
  }

  const description = normalizeOptionalText(payload.description, 1000);
  if (typeof payload.description === "string" && payload.description.trim().length > 1000) {
    return { ok: false, message: "설명은 1000자 이하로 입력해 주세요." };
  }

  const level = payload.level ?? "all";
  if (!isAcademyClassLevel(level)) {
    return { ok: false, message: "허용되지 않은 레벨입니다." };
  }

  const lessonType = payload.lessonType ?? "group";
  if (!isAcademyClassLessonType(lessonType)) {
    return { ok: false, message: "허용되지 않은 수업 유형입니다." };
  }

  const instructorName = normalizeOptionalText(payload.instructorName, 50);
  if (
    typeof payload.instructorName === "string" &&
    payload.instructorName.trim().length > 50
  ) {
    return { ok: false, message: "강사명은 50자 이하로 입력해 주세요." };
  }

  const location = normalizeOptionalText(payload.location, 100);
  if (typeof payload.location === "string" && payload.location.trim().length > 100) {
    return { ok: false, message: "장소는 100자 이하로 입력해 주세요." };
  }

  const scheduleText = normalizeOptionalText(payload.scheduleText, 200);
  if (
    typeof payload.scheduleText === "string" &&
    payload.scheduleText.trim().length > 200
  ) {
    return { ok: false, message: "일정 안내는 200자 이하로 입력해 주세요." };
  }

  const capacityResult = parseOptionalNonNegativeNumber(payload.capacity, "정원");
  if ("error" in capacityResult) return { ok: false, message: capacityResult.error };

  const priceResult = parseOptionalNonNegativeNumber(payload.price, "가격");
  if ("error" in priceResult) return { ok: false, message: priceResult.error };

  const status = payload.status ?? "draft";
  if (!isAcademyClassStatus(status)) {
    return { ok: false, message: "허용되지 않은 상태입니다." };
  }

  return {
    ok: true,
    value: {
      name,
      description,
      level,
      lessonType,
      instructorName,
      location,
      scheduleText,
      capacity: capacityResult.value,
      price: priceResult.value,
      status,
    },
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "유효하지 않은 클래스 ID입니다." },
      { status: 400 },
    );
  }

  const item = await guard.db
    .collection(COLLECTION_NAME)
    .findOne({ _id: new ObjectId(id) });

  if (!item) {
    return NextResponse.json(
      { success: false, message: "클래스를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, item: serializeClass(item) });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "유효하지 않은 클래스 ID입니다." },
      { status: 400 },
    );
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const validation = validateClassPayload(payload);
  if (!validation.ok) {
    return NextResponse.json(
      { success: false, message: validation.message },
      { status: 400 },
    );
  }

  const updated = await guard.db.collection(COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...validation.value, updatedAt: new Date().toISOString() } },
    { returnDocument: "after" },
  );

  if (!updated) {
    return NextResponse.json(
      { success: false, message: "클래스를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, item: serializeClass(updated) });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "유효하지 않은 클래스 ID입니다." },
      { status: 400 },
    );
  }

  const updated = await guard.db.collection(COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { status: "hidden", updatedAt: new Date().toISOString() } },
    { returnDocument: "after" },
  );

  if (!updated) {
    return NextResponse.json(
      { success: false, message: "클래스를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, item: serializeClass(updated) });
}
