export const isHttps = (process.env.NEXT_PUBLIC_SITE_URL ?? '').startsWith('https://') || (process.env.VERCEL_URL ?? '').startsWith('https://');

export const baseCookie = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production' ? isHttps : false,
};
