export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your-access-token-secret';
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret';

// 초 단위 (JWT와 쿠키 모두에 사용 가능)
export const ACCESS_TOKEN_EXPIRES_IN = 60; // 1시간
export const REFRESH_TOKEN_EXPIRES_IN = 60 * 60 * 24 * 7; // 7일
