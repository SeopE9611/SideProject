import { getBaseUrl } from '@/lib/getBaseUrl';

function computeIsHttps() {
  try {
    const url = new URL(getBaseUrl());
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const isHttps = computeIsHttps();

export const baseCookie = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production' ? isHttps : false,
};
