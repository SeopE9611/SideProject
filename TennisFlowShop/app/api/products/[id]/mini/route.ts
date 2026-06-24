import { racketBrandLabel } from "@/lib/constants";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { normalizeItemShippingFee } from "@/lib/shipping-fee";
import {
  hasPaidMountingFee,
  isMountableStringByFee,
} from "@/lib/orders/string-mounting-policy";
import { getEffectiveProductPrice } from "@/lib/product-pricing";
import { getEffectiveRacketPrice } from "@/lib/racket-pricing";
import {
  productVisibilityFilterFor,
  racketVisibilityFilterFor,
} from "@/lib/public-visibility";
import { getVisibilityViewerFromCookies } from "@/lib/public-visibility-viewer";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const db = await getDb();
  const idObj = new ObjectId(id);
  const idFilter = { _id: idObj };

  const projection = {
    // products
    name: 1,
    title: 1,
    thumbnail: 1,
    images: 1,
    mountingFee: 1,
    price: 1,
    inventory: 1,
    shippingFee: 1,

    // used_rackets
    brand: 1,
    model: 1,
    marketing: 1,
  };

  // 1) products 먼저
  const prod = await db
    .collection("products")
    .findOne(
      {
        ...idFilter,
        ...productVisibilityFilterFor(await getVisibilityViewerFromCookies()),
      },
      { projection },
    );

  if (prod) {
    const rawMountingFee = (prod as any).mountingFee;
    const rawShippingFee = (prod as any).shippingFee;

    const safeMountingFee = hasPaidMountingFee(rawMountingFee)
      ? rawMountingFee
      : 0;
    const isMountableString = isMountableStringByFee(rawMountingFee);
    const safePrice = getEffectiveProductPrice(
      prod as {
        price?: unknown;
        inventory?: { isSale?: unknown; salePrice?: unknown } | null;
      },
    );

    return NextResponse.json(
      {
        ok: true,
        kind: "product" as const,
        href: `/products/${id}`,
        name: prod.name ?? prod.title ?? "상품",
        image:
          prod.thumbnail ||
          (Array.isArray(prod.images) && prod.images[0]) ||
          null,
        mountingFee: safeMountingFee,
        isMountableString,
        price: safePrice,
        shippingFee: normalizeItemShippingFee(rawShippingFee),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // 2) 없으면 used_rackets도 조회
  const racket = await db
    .collection("used_rackets")
    .findOne(
      {
        ...idFilter,
        ...racketVisibilityFilterFor(await getVisibilityViewerFromCookies()),
      },
      { projection },
    );

  if (racket) {
    const rawShippingFee = (racket as any).shippingFee;
    const safePrice = getEffectiveRacketPrice(racket);

    return NextResponse.json(
      {
        ok: true,
        kind: "racket" as const,
        href: `/rackets/${id}`,
        name: (() => {
          const brand = String((racket as any).brand ?? "").trim();
          const model = String((racket as any).model ?? "").trim();
          const computed = `${racketBrandLabel(brand)} ${model}`.trim();
          return (
            computed || (racket as any).name || (racket as any).title || "라켓"
          );
        })(),
        image:
          (racket as any).thumbnail ||
          (Array.isArray((racket as any).images) &&
            (racket as any).images[0]) ||
          null,
        mountingFee: 0, // 라켓은 장착비 개념 없음(필요하면 정책에 맞게)
        isMountableString: false,
        price: safePrice,
        shippingFee: normalizeItemShippingFee(rawShippingFee),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json({ ok: false, error: "notFound" }, { status: 404 });
}
