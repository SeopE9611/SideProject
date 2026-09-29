import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifyAccessToken } from "@/lib/auth.utils";
import { getDb } from "@/lib/mongodb";
import { productVisibilityFilterFor } from "@/lib/public-visibility";
import { getVisibilityViewerFromCookies } from "@/lib/public-visibility-viewer";

// “개별 아이템” 한 개만 제거 - 해당 productId 한 건만 삭제(deleteOne)

const WISHLIST_OPTION_FIELDS = [
  "selectedGauge",
  "selectedColor",
  "selectedColorLabel",
  "selectedColorHex",
  "selectedColorImage",
] as const;

function safeVerifyAccessToken(token?: string | null) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

function cleanOptionValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function buildWishlistOptionUpdate(body: any) {
  const $set: Record<string, string> = {};
  const $unset: Record<string, ""> = {};

  for (const field of WISHLIST_OPTION_FIELDS) {
    const value = cleanOptionValue(body?.[field]);
    if (value) $set[field] = value;
    else $unset[field] = "";
  }

  return {
    ...(Object.keys($set).length ? { $set } : {}),
    ...(Object.keys($unset).length ? { $unset } : {}),
  };
}

async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  const user = safeVerifyAccessToken(token);
  if (!user)
    return {
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };

  const userId = String((user as any).sub ?? "");
  if (!ObjectId.isValid(userId)) {
    return {
      response: NextResponse.json({ error: "Invalid token payload" }, { status: 400 }),
    };
  }

  return { userId };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const auth = await getAuthenticatedUserId();
    if (auth.response) return auth.response;

    const { productId } = await params;
    if (!ObjectId.isValid(productId)) {
      return NextResponse.json({ error: "Invalid productId" }, { status: 400 });
    }

    let body: any = null;
    try {
      body = await req.json();
    } catch (e) {
      console.error("[wishlist] invalid json", e);
      return NextResponse.json({ message: "INVALID_JSON" }, { status: 400 });
    }

    const db = await getDb();
    const productObjectId = new ObjectId(productId);
    const prod = await db.collection("products").findOne({
      _id: productObjectId,
      ...productVisibilityFilterFor(await getVisibilityViewerFromCookies()),
    });
    if (!prod) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    const result = await db
      .collection("wishlists")
      .updateOne(
        { userId: new ObjectId(auth.userId), productId: productObjectId },
        buildWishlistOptionUpdate(body),
      );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Wishlist item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[wishlist] PATCH error", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const auth = await getAuthenticatedUserId();
    if (auth.response) return auth.response;

    const { productId } = await params;
    if (!ObjectId.isValid(productId)) {
      return NextResponse.json({ error: "Invalid productId" }, { status: 400 });
    }

    const db = await getDb();
    await db.collection("wishlists").deleteOne({
      userId: new ObjectId(auth.userId),
      productId: new ObjectId(productId),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[wishlist] DELETE error", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
