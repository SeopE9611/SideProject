// lib/pricing.ts
// ─────────────────────────────────────────────────────────────
// 스트링 교체 서비스 "정산 금액"을 서버에서 일관 계산하기 위한 유틸.
// - 커스텀('custom'): 15,000원
// - 상품 지정(ID): products.mountingFee 합산
// 프런트 표시용은 계속 lib/stringing-prices.ts를 사용하되,
// 실제로 저장/정산되는 금액은 "항상" 이 유틸의 결과를 기준으로 합니다.
// ─────────────────────────────────────────────────────────────
import type { Db } from "mongodb";
import { ObjectId } from "mongodb";

import { CUSTOM_STRING_MOUNTING_FEE } from "@/lib/stringing-pricing-policy";

function createInvalidStringProductError(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

async function resolveStringProductMountingFee(
  db: Db,
  productId: string,
): Promise<number> {
  if (!ObjectId.isValid(productId)) {
    throw createInvalidStringProductError(
      "유효하지 않은 스트링 상품 ID입니다.",
    );
  }

  const prod = await db
    .collection("products")
    .findOne(
      { _id: new ObjectId(productId), isDeleted: { $ne: true } },
      { projection: { mountingFee: 1 } },
    );
  if (!prod) {
    throw createInvalidStringProductError("존재하지 않는 스트링 상품입니다.");
  }

  const fee = Number(prod.mountingFee);
  if (!Number.isFinite(fee) || fee <= 0) {
    throw createInvalidStringProductError(
      "장착 가능한 스트링 상품이 아닙니다.",
    );
  }

  return Math.round(fee);
}

export async function calcStringingTotal(
  db: Db,
  stringTypes: string[] | undefined | null,
): Promise<number> {
  let sum = 0;

  for (const id of stringTypes ?? []) {
    if (id === "custom") {
      // 직접입력/보유 스트링: 정책 상수 기준
      sum += CUSTOM_STRING_MOUNTING_FEE;
      continue;
    }
    sum += await resolveStringProductMountingFee(db, id);
  }

  // 방어적 처리: 음수/NaN 방지 + 정수 반올림
  return Math.max(0, Math.round(sum));
}

export async function calcStringingMountingFeeByProductId(
  db: Db,
  productId: string | undefined | null,
): Promise<number> {
  if (productId === "custom") {
    return CUSTOM_STRING_MOUNTING_FEE;
  }
  if (!productId) {
    throw createInvalidStringProductError("스트링 상품 ID가 필요합니다.");
  }

  return resolveStringProductMountingFee(db, productId);
}
