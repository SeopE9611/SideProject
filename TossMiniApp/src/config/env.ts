const DEFAULT_API_BASE_URL = "https://www.dokkaebitennis.com";

function removeTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const API_BASE_URL = removeTrailingSlash(
  configuredApiBaseUrl || DEFAULT_API_BASE_URL,
);
