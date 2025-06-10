import { headers } from 'next/headers';
import { getTokenFromHeader, verifyAccessToken } from './auth.utils';

export async function auth() {
  const headersList = await headers();
  console.log('[AUTH HEADERS]', Object.fromEntries(headersList.entries())); // ✅ 추가

  const token = getTokenFromHeader(headersList);
  console.log('[AUTH TOKEN]', token);

  if (!token) return null;

  const payload = verifyAccessToken(token);
  console.log('[AUTH PAYLOAD]', payload);

  if (!payload) return null;

  return { user: payload };
}
