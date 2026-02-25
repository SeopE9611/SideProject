// 가격 계산 함수
export function getStringingServicePrice(stringType: string, isCustom: boolean): number {
  if (isCustom) return 15000; // 직접입력 or 보유 스트링 → 미포함 기준
  if (stringType) return 35000; // 스트링 상품 선택 → 포함 기준
  return 0; // 기타: 안내 필요
}
