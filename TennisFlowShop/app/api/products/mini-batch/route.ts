import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { normalizeItemShippingFee } from "@/lib/shipping-fee";
import { hasPaidMountingFee, isMountableStringByFee } from "@/lib/orders/string-mounting-policy";

type MiniBatchRow = {
  id: string;
  mountingFee: number;
  shippingFee: number;
  isMountableString: boolean;
};

export async function POST(req: Request) {
  let ids: string[] = [];

  try {
    const body = await req.json();
    ids = Array.isArray(body?.ids)
      ? body.ids.map((v: unknown) => String(v)).filter(Boolean)
      : [];
  } catch {
    return NextResponse.json({ ok: false, error: "invalidBody" }, { status: 400 });
  }

  if (ids.length === 0) {
    return NextResponse.json(
      { ok: true, items: [] as MiniBatchRow[] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const uniqueIds = Array.from(new Set(ids));
  const validObjectIds = uniqueIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));

  const db = await getDb();
  const products =
    validObjectIds.length > 0
      ? await db
          .collection("products")
          .find(
            { _id: { $in: validObjectIds } },
            { projection: { _id: 1, mountingFee: 1, shippingFee: 1 } },
          )
          .toArray()
      : [];

  const feeById = new Map<string, { mountingFee: number; shippingFee: number; isMountableString: boolean }>();
  products.forEach((product) => {
    const rawMounting = (product as { mountingFee?: unknown }).mountingFee;
    feeById.set(String(product._id), {
      mountingFee: hasPaidMountingFee(rawMounting) ? rawMounting : 0,
      shippingFee: normalizeItemShippingFee((product as { shippingFee?: unknown }).shippingFee),
      isMountableString: isMountableStringByFee(rawMounting),
    });
  });

  const items: MiniBatchRow[] = uniqueIds.map((id) => ({
    id,
    mountingFee: feeById.get(id)?.mountingFee ?? 0,
    shippingFee: feeById.get(id)?.shippingFee ?? 3000,
    isMountableString: feeById.get(id)?.isMountableString === true,
  }));

  return NextResponse.json(
    { ok: true, items },
    { headers: { "Cache-Control": "no-store" } },
  );
}
