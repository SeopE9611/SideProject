import "server-only";

const REQUIRED_ENV_NAMES = [
  "APPS_IN_TOSS_MTLS_CERT_BASE64",
  "APPS_IN_TOSS_MTLS_PRIVATE_KEY_BASE64",
  "APPS_IN_TOSS_LOGIN_DECRYPTION_KEY",
  "APPS_IN_TOSS_LOGIN_AAD",
] as const;

export const APPS_IN_TOSS_APP_NAME = "dokkaebitennis";
export const APPS_IN_TOSS_API_HOST = "apps-in-toss-api.toss.im";
export const APPS_IN_TOSS_HTTP_TIMEOUT_MS = 8_000;
export const APPS_IN_TOSS_MAX_RESPONSE_BYTES = 64 * 1024;

export class AppsInTossConfigurationError extends Error {
  constructor() {
    super(`Apps in Toss 서버 설정이 올바르지 않습니다. 환경변수 이름을 확인하세요: ${REQUIRED_ENV_NAMES.join(", ")}`);
    this.name = "AppsInTossConfigurationError";
  }
}

function requiredEnvironmentValue(name: (typeof REQUIRED_ENV_NAMES)[number]) {
  const value = process.env[name];
  if (!value) throw new AppsInTossConfigurationError();
  return value;
}

export function getAppsInTossMtlsCredentials() {
  return {
    cert: Buffer.from(requiredEnvironmentValue("APPS_IN_TOSS_MTLS_CERT_BASE64"), "base64"),
    key: Buffer.from(requiredEnvironmentValue("APPS_IN_TOSS_MTLS_PRIVATE_KEY_BASE64"), "base64"),
  };
}

export function getAppsInTossLoginDecryptionConfig() {
  return {
    keyBase64: requiredEnvironmentValue("APPS_IN_TOSS_LOGIN_DECRYPTION_KEY"),
    aad: requiredEnvironmentValue("APPS_IN_TOSS_LOGIN_AAD"),
  };
}
