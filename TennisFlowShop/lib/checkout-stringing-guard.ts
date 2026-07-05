type MinimalStringingApplicationInput = {
  name?: string;
  phone?: string;
  stringTypes?: unknown[];
};

export const STRINGING_APPLICATION_REQUIRED_MESSAGE =
  "교체서비스 포함 주문에는 신청서 정보가 필요합니다. 신청 정보를 다시 확인해 주세요.";

export const STRINGING_APPLICATION_REQUIRED_CLIENT_MESSAGE =
  "교체서비스 신청 정보가 누락되었습니다. 신청 정보를 다시 확인한 뒤 결제를 진행해 주세요.";

export function hasStringingServiceInCheckout(input: {
  withStringService?: unknown;
  isStringServiceApplied?: unknown;
  shippingInfo?: unknown;
  stringing?: { requested?: unknown } | null;
}): boolean {
  const shippingInfo =
    input.shippingInfo && typeof input.shippingInfo === "object"
      ? (input.shippingInfo as { withStringService?: unknown })
      : null;

  return Boolean(
    input.withStringService === true ||
    input.isStringServiceApplied === true ||
    shippingInfo?.withStringService === true ||
    input.stringing?.requested === true,
  );
}

export function hasEnoughStringingApplicationInputForOrder(
  input: unknown,
): input is MinimalStringingApplicationInput {
  if (!input || typeof input !== "object") return false;

  const candidate = input as MinimalStringingApplicationInput;
  const hasName = typeof candidate.name === "string" && candidate.name.trim().length > 0;
  const hasPhone = typeof candidate.phone === "string" && candidate.phone.trim().length > 0;
  const hasStringTypes =
    Array.isArray(candidate.stringTypes) &&
    candidate.stringTypes.some((value) => typeof value === "string" && value.trim().length > 0);

  return hasName && hasPhone && hasStringTypes;
}

export function validateStringingApplicationInputForOrder(
  requiresInput: boolean,
  input: unknown,
): { ok: true } | { ok: false; message: string } {
  if (!requiresInput || hasEnoughStringingApplicationInputForOrder(input)) return { ok: true };

  return { ok: false, message: STRINGING_APPLICATION_REQUIRED_MESSAGE };
}
