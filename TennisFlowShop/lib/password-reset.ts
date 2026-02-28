import crypto from 'crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';

const RECOVERY_TOKEN_SECRET = process.env.RECOVERY_TOKEN_SECRET!;

/**
 * 비밀번호 재설정 전용 JWT payload 타입
 * - sub: 사용자 ID
 * - email: 해당 사용자 이메일
 * - type: 다른 토큰과 구분하기 위한 안전장치
 */
export type PasswordResetTokenPayload = JwtPayload & {
  sub: string;
  email: string;
  type: 'password_reset';
};

/**
 * 비밀번호 재설정용 토큰 발급
 *
 * 왜 JWT를 쓰는가?
 * - 만료시간(exp)을 넣기 쉽습니다.
 * - payload에 sub, email 등을 담아 검증할 수 있습니다.
 */
export function createPasswordResetToken(userId: string, email: string) {
  return jwt.sign(
    {
      sub: userId,
      email,
      type: 'password_reset',
    },
    RECOVERY_TOKEN_SECRET,
    {
      expiresIn: '30m', // 30분 후 만료
    },
  );
}

/**
 * 비밀번호 재설정 토큰 검증
 *
 * null을 반환하는 형태로 만들어 두면,
 * API 쪽에서 try/catch를 반복하지 않고 깔끔하게 처리할 수 있습니다.
 */
export function verifyPasswordResetToken(token: string): PasswordResetTokenPayload | null {
  try {
    const decoded = jwt.verify(token, RECOVERY_TOKEN_SECRET);

    // jwt.verify의 반환 타입은 string | JwtPayload 이므로 안전하게 좁혀줍니다.
    if (typeof decoded === 'string') return null;

    // type/sub/email이 기대한 구조가 아니면 거부
    if (decoded.type !== 'password_reset') return null;
    if (typeof decoded.sub !== 'string') return null;
    if (typeof decoded.email !== 'string') return null;

    return decoded as PasswordResetTokenPayload;
  } catch {
    return null;
  }
}

/**
 * DB에는 토큰 원문을 그대로 저장하지 않고 해시값만 저장합니다.
 *
 * 이유:
 * - DB가 노출되어도 토큰 원문이 바로 털리지 않게 하기 위함
 * - reset 링크는 원문 토큰을 들고 오고, DB에는 해시만 저장해서 비교
 */
export function hashPasswordResetToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
