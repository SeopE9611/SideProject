export const REFUND_BANKS = [
  ["kb", "국민은행"], ["shinhan", "신한은행"], ["woori", "우리은행"], ["hana", "하나은행"],
  ["ibk", "기업은행"], ["nh", "농협은행"], ["sc", "SC제일은행"], ["citi", "한국씨티은행"],
  ["kakao", "카카오뱅크"], ["kbank", "케이뱅크"], ["toss", "토스뱅크"], ["busan", "부산은행"],
  ["kn", "경남은행"], ["gwangju", "광주은행"], ["jeonbuk", "전북은행"], ["jeju", "제주은행"],
  ["im", "iM뱅크(구 대구은행)"], ["suhyup", "수협은행"], ["mg", "새마을금고"], ["cu", "신협"],
  ["savings", "저축은행"], ["sj", "산림조합"], ["post", "우체국"], ["kdb", "산업은행"],
] as const;

export function refundBankLabel(code: string) { return REFUND_BANKS.find(([value]) => value === code)?.[1] ?? "은행 미선택"; }
