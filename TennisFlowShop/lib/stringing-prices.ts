import { CUSTOM_STRING_MOUNTING_FEE } from "@/lib/stringing-pricing-policy";

// 레거시 참조용 가격 계산 함수
// - 실제 최종 정산은 calcStringingTotal(lib/pricing.ts)을 기준으로 처리한다.
export function getStringingServicePrice(
  _stringType: string,
  isCustom: boolean,
): number {
  if (isCustom) return CUSTOM_STRING_MOUNTING_FEE;
  return 0;
}
