import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { getHangulInitials } from "@/lib/hangul-utils";
import { getDb } from "@/lib/mongodb";
import { normalizeItemShippingFee } from "@/lib/shipping-fee";
import { appendAdminAudit } from "@/lib/admin/appendAdminAudit";
import type {
  AdminProductMutationResponseDto,
  AdminProductUpdateRequestDto,
} from "@/types/admin/products";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function toProductAuditSnapshot(doc: Record<string, unknown> | null) {
  const safe = doc ?? {};
  const inventory = asRecord(safe.inventory);
  return {
    name: asString(safe.name),
    brand: asString(safe.brand),
    price: typeof safe.price === "number" ? safe.price : null,
    stock: typeof inventory?.stock === "number" ? inventory.stock : null,
    status: asString(safe.status) || undefined,
    isActive:
      typeof safe.isActive === "boolean" ? (safe.isActive as boolean) : undefined,
    isPublished:
      typeof safe.isPublished === "boolean"
        ? (safe.isPublished as boolean)
        : undefined,
    imageCount: Array.isArray(safe.images) ? safe.images.length : 0,
  };
}

function parseUpdateRequest(raw: unknown): AdminProductUpdateRequestDto | null {
  const body = asRecord(raw);
  if (!body) return null;

  return {
    name: asString(body.name),
    sku: asString(body.sku),
    shortDescription: asString(body.shortDescription),
    description: asString(body.description),
    brand: asString(body.brand),
    material: asString(body.material),
    gauge: asString(body.gauge),
    color: asString(body.color),
    length: asString(body.length),
    mountingFee: asNumber(body.mountingFee),
    price: asNumber(body.price),
    shippingFee: normalizeItemShippingFee(body.shippingFee),
    features: asRecord(body.features) ?? {},
    tags: asRecord(body.tags) ?? {},
    specifications: asRecord(body.specifications) ?? {},
    additionalFeatures: asString(body.additionalFeatures),
    images: asStringArray(body.images),
    inventory: asRecord(body.inventory) ?? {},
    searchKeywords: asStringArray(body.searchKeywords),
  };
}

function invalidIdResponse() {
  return NextResponse.json(
    { message: "유효하지 않은 상품 ID입니다." },
    { status: 400 },
  );
}

/**
 * 단일 상품 조회 (관리자)
 * - 스트링 수정 페이지(/admin/products/[id]/edit)에서 GET /api/admin/products/:id 로 호출.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;

  const { id } = await params;
  if (!ObjectId.isValid(id)) return invalidIdResponse();

  try {
    const db = await getDb();
    const prod = await db
      .collection("products")
      .findOne(
        { _id: new ObjectId(id), isDeleted: { $ne: true } },
        { projection: { isDeleted: 0 } },
      );

    if (!prod) {
      return NextResponse.json(
        { message: "상품을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      product: {
        ...prod,
        shippingFee: normalizeItemShippingFee((prod as Record<string, unknown>).shippingFee),
        _id: prod._id.toString(),
      },
    });
  } catch (err) {
    console.error("[admin/products/[id]] get error", err);
    return NextResponse.json({ message: "서버 오류" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  try {
    const rawBody: unknown = await req.json();
    const requestDto = parseUpdateRequest(rawBody);
    if (!requestDto) {
      return NextResponse.json(
        { message: "요청 바디 형식이 잘못되었습니다." },
        { status: 400 },
      );
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) return invalidIdResponse();

    const updateData = {
      ...requestDto,
      searchInitials: getHangulInitials(requestDto.name),
      brandInitials: getHangulInitials(requestDto.brand),
    };

    const db = await getDb();
    const beforeDoc = (await db
      .collection("products")
      .findOne({ _id: new ObjectId(id) })) as Record<string, unknown> | null;
    const result = await db
      .collection("products")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "상품 업데이트 실패" },
        { status: 500 },
      );
    }

    const afterDoc = (await db
      .collection("products")
      .findOne({ _id: new ObjectId(id) })) as Record<string, unknown> | null;
    const before = toProductAuditSnapshot(beforeDoc);
    const after = toProductAuditSnapshot(afterDoc);
    await appendAdminAudit(
      db,
      {
        type: "product.update",
        actorId: guard.admin._id,
        targetId: id,
        message: "관리자 상품 수정",
        diff: {
          targetType: "product",
          before: {
            name: before.name,
            brand: before.brand,
            price: before.price,
            stock: before.stock,
            status: before.status,
            isActive: before.isActive,
            isPublished: before.isPublished,
          },
          after: {
            name: after.name,
            brand: after.brand,
            price: after.price,
            stock: after.stock,
            status: after.status,
            isActive: after.isActive,
            isPublished: after.isPublished,
          },
          metadata: {
            changedKeys: Object.keys(updateData),
            imageCountBefore: before.imageCount,
            imageCountAfter: after.imageCount,
          },
        },
      },
      req,
    );

    const responseDto: AdminProductMutationResponseDto = {
      message: "상품이 성공적으로 업데이트되었습니다.",
    };
    return NextResponse.json(responseDto);
  } catch (err) {
    console.error("[admin/products/[id]] update error", err);
    return NextResponse.json({ message: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { id } = await params;
  if (!ObjectId.isValid(id)) return invalidIdResponse();

  try {
    const db = await getDb();
    const beforeDoc = (await db.collection("products").findOne({
      _id: new ObjectId(id),
    })) as Record<string, unknown> | null;
    const result = await db
      .collection("products")
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { isDeleted: true, deletedAt: new Date() } },
      );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "상품을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    const before = toProductAuditSnapshot(beforeDoc);
    await appendAdminAudit(
      db,
      {
        type: "product.delete",
        actorId: guard.admin._id,
        targetId: id,
        message: "관리자 상품 삭제",
        diff: {
          targetType: "product",
          before: {
            name: before.name,
            brand: before.brand,
            price: before.price,
            stock: before.stock,
            status: before.status,
            isActive: before.isActive,
            isPublished: before.isPublished,
          },
          after: { deleted: true },
          metadata: { softDelete: true },
        },
      },
      req,
    );
    return NextResponse.json(
      { message: "상품이 삭제되었습니다." },
      { status: 200 },
    );
  } catch (err) {
    console.error("[admin/products/[id]] delete error", err);
    return NextResponse.json({ message: "서버 오류" }, { status: 500 });
  }
}
