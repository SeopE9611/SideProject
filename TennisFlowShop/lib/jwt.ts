import jwt, { SignOptions } from 'jsonwebtoken';

/**
 * JWT 생성 유틸
 */
export function createToken(
  payload: string | object | Buffer,
  secret: string,
  options?: SignOptions //  expiresIn을 포함한 옵션 객체
): string {
  return jwt.sign(payload, secret, options);
}
