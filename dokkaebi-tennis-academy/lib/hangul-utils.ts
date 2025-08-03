// 초성 추출 유틸리티 함수
export function getHangulInitials(str: string): string {
  const INITIALS = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

  return Array.from(str)
    .map((char) => {
      const code = char.charCodeAt(0) - 0xac00;
      if (code < 0 || code > 11171) return char; // 한글이 아님
      const initialIndex = Math.floor(code / 588);
      return INITIALS[initialIndex];
    })
    .join('');
}
