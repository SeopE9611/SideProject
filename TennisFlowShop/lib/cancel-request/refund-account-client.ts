import type { RefundAccountInfo } from "@/lib/cancel-request/refund-account";

export type RefundAccountFieldErrors = {
  bank?: string[];
  account?: string[];
  holder?: string[];
};

type ValidateResult =
  | { ok: true; value: RefundAccountInfo }
  | { ok: false; message: string; fieldErrors: RefundAccountFieldErrors };

export function validateRefundAccountInput(
  input: Partial<RefundAccountInfo> | null | undefined,
): ValidateResult {
  // 입력값은 공백 제거/숫자 정규화 후 검사한다.
  const bank = String(input?.bank ?? "").trim();
  const account = String(input?.account ?? "").replace(/\D/g, "");
  const holder = String(input?.holder ?? "").trim();

  if (!bank) {
    return {
      ok: false,
      message: "환불 은행을 선택해주세요.",
      fieldErrors: { bank: ["환불 은행을 선택해주세요."] },
    };
  }
  if (!account) {
    return {
      ok: false,
      message: "환불 계좌번호를 입력해주세요.",
      fieldErrors: { account: ["환불 계좌번호를 입력해주세요."] },
    };
  }
  if (account.length < 8 || account.length > 20) {
    return {
      ok: false,
      message: "계좌번호는 숫자 8~20자리로 입력해주세요.",
      fieldErrors: { account: ["계좌번호는 숫자 8~20자리로 입력해주세요."] },
    };
  }
  if (!holder) {
    return {
      ok: false,
      message: "예금주명을 입력해주세요.",
      fieldErrors: { holder: ["예금주명을 입력해주세요."] },
    };
  }
  if (holder.length < 2) {
    return {
      ok: false,
      message: "예금주명은 2자 이상 입력해주세요.",
      fieldErrors: { holder: ["예금주명은 2자 이상 입력해주세요."] },
    };
  }

  return {
    ok: true,
    value: {
      bank,
      account,
      holder,
    },
  };
}

export async function readCancelRequestError(
  response: Response,
  fallback = "취소 요청 처리 중 오류가 발생했습니다.",
) {
  let payload: any = null;
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    payload = await response.json().catch(() => null);
  } else {
    const text = await response.text().catch(() => "");
    const trimmed = text.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      payload = (() => {
        try {
          return JSON.parse(trimmed);
        } catch {
          return { message: trimmed };
        }
      })();
    } else if (trimmed) {
      payload = { message: trimmed };
    }
  }

  const fieldErrors = (payload?.fieldErrors ?? {}) as RefundAccountFieldErrors;
  const firstFieldMessage =
    fieldErrors.bank?.[0] ||
    fieldErrors.account?.[0] ||
    fieldErrors.holder?.[0];
  const message =
    firstFieldMessage ||
    payload?.message ||
    payload?.detail ||
    payload?.error ||
    fallback;

  return {
    message,
    errorCode: payload?.errorCode,
    fieldErrors,
    detail: payload?.detail,
    error: payload?.error,
    data: payload?.data,
  };
}
