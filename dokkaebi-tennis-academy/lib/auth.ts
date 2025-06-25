import { cookies } from 'next/headers';
import { verifyAccessToken } from './auth.utils';

export async function auth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  console.log('[AUTH COOKIE TOKEN]', token); // 디버깅용

  if (!token) return null;

  const payload = verifyAccessToken(token);
  if (!payload) return null;

  return { user: payload };
}
