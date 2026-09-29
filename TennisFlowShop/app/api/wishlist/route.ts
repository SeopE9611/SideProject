import { verifyAccessToken } from "@/lib/auth.utils";
import { getDb } from "@/lib/mongodb";
import { getEffectiveProductPrice, getProductPriceDisplayMeta } from "@/lib/product-pricing";
import {
  getColorLabel,
  getGaugeLabel,
  getVariantBySelection,
  isColorSoldOut,
  isSellableVariant,
  normalizeColorRows,
  normalizeGaugeRows,
  normalizeVariantRows,
} from "@/lib/products/string-stock";
import { productVisibilityFilterFor } from "@/lib/public-visibility";
import { getVisibilityViewerFromCookies } from "@/lib/public-visibility-viewer";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// 내 위시리스트 목록 + 상품 요약

const WISHLIST_OPTION_FIELDS = [
  "selectedGauge",
  "selectedColor",
  "selectedColorLabel",
  "selectedColorHex",
  "selectedColorImage",
] as const;

function cleanOptionValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function buildWishlistOptionPayload(body: any) {
  return WISHLIST_OPTION_FIELDS.reduce<Record<string, string>>((acc, field) => {
    const value = cleanOptionValue(body?.[field]);
    if (value) acc[field] = value;
    return acc;
  }, {});
}

function getWishlistOptionState(row: any) {
  const product = row.product ?? {};
  const selectedColor = cleanOptionValue(row.selectedColor);
  const selectedGauge = cleanOptionValue(row.selectedGauge);
  const variantRows = normalizeVariantRows(product);
  const colorRows = normalizeColorRows(product);
  const gaugeRows = normalizeGaugeRows(product);
  const hasVariants = variantRows.length > 0;
  const requiresColor = hasVariants || colorRows.length > 0;
  const requiresGauge = hasVariants || gaugeRows.length > 0;
  const requiresOption = requiresColor || requiresGauge;
  const hasSelectedOption =
    (!requiresColor || !!selectedColor) && (!requiresGauge || !!selectedGauge);

  if (requiresOption && !hasSelectedOption) {
    return {
      requiresOption,
      hasSelectedOption: false,
      optionAvailable: false,
      optionStock: 0,
      optionStatusMessage: "옵션 선택 필요",
    };
  }

  if (hasVariants) {
    const variant =
      selectedColor && selectedGauge
        ? getVariantBySelection(product, selectedColor, selectedGauge)
        : undefined;
    const optionStock = Math.max(0, Number(variant?.stock ?? 0));
    const optionAvailable = !!variant && isSellableVariant(variant);
    return {
      requiresOption,
      hasSelectedOption,
      optionAvailable,
      optionStock,
      optionStatusMessage: optionAvailable ? "구매 가능" : "품절",
    };
  }

  if (requiresGauge && selectedGauge) {
    const gauge = gaugeRows.find((row) => row.value === selectedGauge);
    const optionStock = Math.max(0, Number(gauge?.stock ?? 0));
    const optionAvailable = !!gauge && gauge.isSoldOut !== true && optionStock > 0;
    return {
      requiresOption,
      hasSelectedOption,
      optionAvailable,
      optionStock,
      optionStatusMessage: optionAvailable ? "구매 가능" : "품절",
    };
  }

  if (requiresColor && selectedColor) {
    const color = colorRows.find((row) => row.value === selectedColor);
    const optionStock = Math.max(0, Number(color?.stock ?? 0));
    const optionAvailable = !!color && !isColorSoldOut(color);
    return {
      requiresOption,
      hasSelectedOption,
      optionAvailable,
      optionStock,
      optionStatusMessage: optionAvailable ? "구매 가능" : "품절",
    };
  }

  const stock = Math.max(0, Number(product?.inventory?.stock ?? 0));
  const managesStock = product?.inventory?.manageStock === true;
  const optionAvailable = !managesStock || stock > 0;
  return {
    requiresOption,
    hasSelectedOption,
    optionAvailable,
    optionStock: stock,
    optionStatusMessage: optionAvailable ? "구매 가능" : "품절",
  };
}

function compactInventoryRows(product: any) {
  return {
    inventory: product?.inventory ?? null,
    variantInventories: normalizeVariantRows(product),
    colorInventories: normalizeColorRows(product).map((row) => ({
      ...row,
      label: getColorLabel(row),
    })),
    gaugeInventories: normalizeGaugeRows(product).map((row) => ({
      ...row,
      label: getGaugeLabel(row),
    })),
  };
}

function safeVerifyAccessToken(token?: string | null) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    const user = safeVerifyAccessToken(token);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const userId = String((user as any).sub ?? "");
    if (!ObjectId.isValid(userId))
      return NextResponse.json({ error: "Invalid token payload" }, { status: 400 });

    const db = await getDb();
    const wishlists = db.collection("wishlists");
    const products = db.collection("products");

    const rows = await wishlists
      .aggregate([
        { $match: { userId: new ObjectId(userId) } },
        { $sort: { createdAt: -1, _id: -1 } },
        {
          $lookup: {
            from: "products",
            localField: "productId",
            foreignField: "_id",
            as: "product",
            pipeline: [
              {
                $match: productVisibilityFilterFor(await getVisibilityViewerFromCookies()),
              },
              {
                $project: {
                  name: 1,
                  price: 1,
                  images: 1,
                  inventory: 1,
                  gaugeOptions: 1,
                  gaugeInventories: 1,
                  color: 1,
                  colorOptions: 1,
                  colorInventories: 1,
                  variantInventories: 1,
                },
              },
            ],
          },
        },
        { $unwind: "$product" },
        {
          $project: {
            _id: 0,
            productId: 1,
            createdAt: 1,
            selectedGauge: 1,
            selectedColor: 1,
            selectedColorLabel: 1,
            selectedColorHex: 1,
            selectedColorImage: 1,
            product: 1,
          },
        },
      ])
      .toArray();

    return NextResponse.json({
      items: rows.map((r) => {
        const optionState = getWishlistOptionState(r);
        const inventoryState = compactInventoryRows(r.product);
        const effectivePrice = getEffectiveProductPrice(r.product);
        const priceMeta = getProductPriceDisplayMeta(r.product);

        return {
          id: r.productId.toString(),
          name: r.product.name,
          price: effectivePrice,
          regularPrice: priceMeta.regularPrice ?? null,
          salePrice: priceMeta.salePrice ?? null,
          discountAmount: priceMeta.discountAmount ?? null,
          discountRate: priceMeta.discountRate ?? null,
          image: r.selectedColorImage || r.product.images?.[0] || "/placeholder.svg",
          stock: optionState.optionStock ?? r.product?.inventory?.stock ?? 0,
          createdAt: r.createdAt,
          selectedGauge: r.selectedGauge,
          selectedColor: r.selectedColor,
          selectedColorLabel: r.selectedColorLabel,
          selectedColorHex: r.selectedColorHex,
          selectedColorImage: r.selectedColorImage,
          ...inventoryState,
          ...optionState,
        };
      }),
      total: rows.length,
    });
  } catch (e) {
    console.error("[wishlist] GET error", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

//  { productId } 상품 한개 추가(이미 있으면 409)
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    const user = safeVerifyAccessToken(token);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const userId = String((user as any).sub ?? "");
    if (!ObjectId.isValid(userId))
      return NextResponse.json({ error: "Invalid token payload" }, { status: 400 });

    let body: any = null;
    try {
      body = await req.json();
    } catch (e) {
      console.error("[wishlist] invalid json", e);
      return NextResponse.json({ message: "INVALID_JSON" }, { status: 400 });
    }

    const productId = body?.productId;
    if (typeof productId !== "string" || !productId) {
      return NextResponse.json({ message: "INVALID_PRODUCT_ID" }, { status: 400 });
    }
    if (!productId) return NextResponse.json({ message: "productId required" }, { status: 400 });
    if (!ObjectId.isValid(String(productId)))
      return NextResponse.json({ error: "Invalid productId" }, { status: 400 });

    const db = await getDb();
    const wishlists = db.collection("wishlists");
    const products = db.collection("products");

    const prod = await products.findOne({
      _id: new ObjectId(productId),
      ...productVisibilityFilterFor(await getVisibilityViewerFromCookies()),
    });
    if (!prod) return NextResponse.json({ message: "Product not found" }, { status: 404 });

    const optionPayload = buildWishlistOptionPayload(body);

    await wishlists.insertOne({
      userId: new ObjectId(userId),
      productId: new ObjectId(productId),
      ...optionPayload,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.code === 11000) {
      return NextResponse.json({ message: "Already in wishlist" }, { status: 409 });
    }
    console.error("[wishlist] POST error", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// 컬렉션 전체에서 내 위시리스트 전부 비우기
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;
    const user = safeVerifyAccessToken(token);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const userId = String((user as any).sub ?? "");
    if (!ObjectId.isValid(userId))
      return NextResponse.json({ error: "Invalid token payload" }, { status: 400 });

    const db = await getDb();
    await db.collection("wishlists").deleteMany({ userId: new ObjectId(userId) });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[wishlist] DELETE ALL error", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
