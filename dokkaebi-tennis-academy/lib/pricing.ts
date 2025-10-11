// lib/pricing.ts
// ─────────────────────────────────────────────────────────────
// 스트링 교체 서비스 "정산 금액"을 서버에서 일관 계산하기 위한 유틸.
// - 커스텀('custom'): 15,000원
// - 상품 지정(ID): products.mountingFee 합산
// 프런트 표시용은 계속 lib/stringing-prices.ts를 사용하되,
// 실제로 저장/정산되는 금액은 "항상" 이 유틸의 결과를 기준으로 합니다.
// ─────────────────────────────────────────────────────────────
import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';

export async function calcStringingTotal(db: Db, stringTypes: string[] | undefined | null): Promise<number> {
  let sum = 0;

  for (const id of stringTypes ?? []) {
    if (id === 'custom') {
      // 직접입력/보유 스트링: 기본 작업비 1.5만원
      sum += 15_000;
      continue;
    }
    // 상품 선택: mountingFee 기준 합산 (없으면 0)
    const prod = await db.collection('products').findOne({ _id: new ObjectId(id) }, { projection: { mountingFee: 1 } });

    sum += prod?.mountingFee ?? 0;
  }

  // 방어적 처리: 음수/NaN 방지 + 정수 반올림
  return Math.max(0, Math.round(sum));
}
