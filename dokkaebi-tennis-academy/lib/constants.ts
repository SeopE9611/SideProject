export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your-access-token-secret';
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret';

// 초 단위 (JWT와 쿠키 모두에 사용 가능)
export const ACCESS_TOKEN_EXPIRES_IN = 60 * 60; // 1시간
export const REFRESH_TOKEN_EXPIRES_IN = 60 * 60 * 24 * 7; // 7일

// 은행
export const bankLabelMap: Record<string, { label: string; account: string }> = {
  shinhan: { label: '신한은행', account: '123-456-789012 (예금주: 도깨비테니스)' },
  kookmin: { label: '국민은행', account: '123-45-6789-012 (예금주: 도깨비테니스)' },
  woori: { label: '우리은행', account: '1234-567-890123 (예금주: 도깨비테니스)' },
};
