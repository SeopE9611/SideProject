/**
 * 긴 문자열을 앞부분과 뒷부분만 남기고 중간을 '...'으로 생략하여 축약하는 로직
 * 예: abcdefghijklmnop → abcdef...mnop
 *
 * @param id - 축약할 원본 문자열 (예: 주문 ID)
 * @param front - 앞에서 남길 글자 수 (기본값: 6)
 * @param back - 뒤에서 남길 글자 수 (기본값: 4)
 * @returns 축약된 문자열
 */
export function shortenId(id: string, front = 6, back = 4): string {
  if (id.length <= front + back) return id; // 너무 짧은 경우 그대로 반환
  return `${id.slice(0, front)}...${id.slice(-back)}`;
}
