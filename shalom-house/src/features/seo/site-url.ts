import "server-only";

const DEFAULT_SITE_ORIGIN = "https://shalom-house.vercel.app";

function parseOrigin(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("SHALOM_SITE_URL 설정은 유효한 절대 URL이어야 합니다."); }
  const localHttp = process.env.NODE_ENV === "development" && url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if ((url.protocol !== "https:" && !localHttp) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("SHALOM_SITE_URL 설정은 경로·인증·query·hash가 없는 허용된 origin이어야 합니다.");
  }
  return url.origin;
}

export function getSiteOrigin(): string { return parseOrigin(process.env.SHALOM_SITE_URL ?? DEFAULT_SITE_ORIGIN); }
export function getMetadataBase(): URL { return new URL(getSiteOrigin()); }
export function createAbsolutePublicUrl(pathname: string): string {
  if (!pathname.startsWith("/") || pathname.startsWith("//") || pathname.includes("?") || pathname.includes("#")) {
    throw new Error("공개 pathname은 /로 시작하고 query 또는 hash를 포함하지 않아야 합니다.");
  }
  return new URL(pathname, `${getSiteOrigin()}/`).toString();
}
export function isSearchIndexingEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return false;

  const vercelEnvironment = process.env.VERCEL_ENV;
  if (vercelEnvironment !== undefined && vercelEnvironment !== "production") return false;

  const contentSource = process.env.SHALOM_CONTENT_SOURCE;
  if (contentSource !== "empty" && contentSource !== "mongodb") return false;

  return true;
}
function verification(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined || value === "") return undefined;
  if (value !== value.trim() || value.length > 200 || /\s|[<>]/u.test(value)) {
    throw new Error(`${name} 설정 형식이 올바르지 않습니다.`);
  }
  return value;
}
export function getSearchVerification() {
  return { google: verification("SHALOM_GOOGLE_SITE_VERIFICATION"), naver: verification("SHALOM_NAVER_SITE_VERIFICATION") };
}
