type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  return normalized || null;
}

function getFirstArrayMessage(value: unknown): string | null {
  if (!Array.isArray(value)) return null;

  for (const item of value) {
    const message = isRecord(item) ? getNonEmptyString(item.message) : null;
    if (message) return message;
  }

  return null;
}

function getFirstFieldError(value: unknown): string | null {
  if (!isRecord(value)) return null;

  for (const messages of Object.values(value)) {
    if (!Array.isArray(messages)) continue;

    for (const message of messages) {
      const normalized = getNonEmptyString(message);
      if (normalized) return normalized;
    }
  }

  return null;
}

// API에 따라 error가 문자열 또는 Zod flatten 객체일 수 있으므로 UI 상태와 토스트에는 항상 문자열만 전달합니다.
// details/message/string error/flatten error 순서로 호환하며, 객체 자체를 문자열화해 내부 구조를 노출하지 않습니다.
export function getApiErrorMessage(payload: unknown, fallback: string): string {
  const safeFallback = getNonEmptyString(fallback) ?? "요청 처리에 실패했습니다.";
  if (!isRecord(payload)) return safeFallback;

  const detailMessage = getFirstArrayMessage(payload.details);
  if (detailMessage) return detailMessage;

  const message = getNonEmptyString(payload.message);
  if (message) return message;

  const error = payload.error;
  const stringError = getNonEmptyString(error);
  if (stringError) return stringError;
  if (!isRecord(error)) return safeFallback;

  const nestedMessage = getNonEmptyString(error.message);
  if (nestedMessage) return nestedMessage;

  const formError = getFirstFieldError({ formErrors: error.formErrors });
  if (formError) return formError;

  return getFirstFieldError(error.fieldErrors) ?? safeFallback;
}
