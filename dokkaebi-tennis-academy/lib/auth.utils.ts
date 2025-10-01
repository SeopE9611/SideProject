import jwt, { Secret, SignOptions } from 'jsonwebtoken';

// .env.local에 정의된 Access Token 서명용 시크릿 키를 불러온다.
// 이 키는 서버만 알고 있어야 하며, Access Token의 위조 여부를 검증하는 데 사용된다.
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;

/**
 * 요청 헤더에서 Authorization 값을 파싱하여 Bearer 토큰을 추출한다.
 * @param headers Request Headers 객체
 * @returns Bearer <token> 형식에서 <token> 부분 반환
 */
export function getTokenFromHeader(headers: Headers): string | null {
  const authorization = headers.get('Authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) return null;
  return authorization.split(' ')[1]; // "Bearer abcd.efgh.ijkl" → "abcd.efgh.ijkl"
}

/**
 * 클라이언트가 보낸 Access Token을 검증하고,
 * 유효한 경우 Payload(사용자 정보 등)를 반환한다.
 *
 * @param token 클라이언트로부터 전달받은 JWT 문자열
 * @returns 유효한 경우 Payload (sub, email, role 등 포함), 유효하지 않으면 null 반환
 */
export function verifyAccessToken(token: string) {
  try {
    // jwt.verify는 서명을 검증하고 만료 여부를 확인한다.
    // 서명이 유효하고 만료되지 않았다면 Payload 객체를 반환한다.
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as jwt.JwtPayload;
  } catch (err) {
    // 만료됐거나 위조된 경우 null을 반환한다.
    return null;
  }
}

//  주문 접근 전용 토큰 발급 (게스트용)
export function signOrderAccessToken(
  payload: { orderId: string; emailHash?: string },
  // 7일(초)로 기본값 설정
  expiresIn: SignOptions['expiresIn'] = 60 * 60 * 24 * 7
) {
  const secret: Secret = process.env.ORDER_ACCESS_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET!;
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, secret, options);
}

// 주문 접근 전용 토큰 검증 (게스트용)
export function verifyOrderAccessToken(token: string) {
  try {
    const secret: Secret = process.env.ORDER_ACCESS_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET!;
    return jwt.verify(token, secret) as {
      orderId: string;
      emailHash?: string;
      iat: number;
      exp: number;
    };
  } catch {
    return null;
  }
}
