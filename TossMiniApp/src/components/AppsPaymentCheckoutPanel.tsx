import { checkoutPayment } from "@apps-in-toss/web-framework";
import { useRef, useState } from "react";

import { AppsAuthApiError } from "../api/auth";
import {
  AppsPaymentApiError,
  completeAppsPayment,
  getAppsPaymentIntent,
  type AppsPaymentIntentState,
  type AppsPaymentPrepareResult,
  type AppsPaymentSummary,
} from "../api/payments";
import { AppsLoginBridgeError, useAppsInTossAuth } from "../auth/AppsInTossAuthContext";
import {
  canStorePendingAppsPayment,
  clearPendingAppsPayment,
  readPendingAppsPayment,
  savePendingAppsPayment,
} from "../lib/pending-payment";
import { formatPrice } from "../lib/product-labels";

type Props = {
  paymentPurpose?: "stringing_service" | "racket_purchase" | "racket_rental";
  paymentAttemptId: string | null;
  onPaymentAttemptIdChange: (value: string | null) => void;
  preparePayment: (attemptId: string, sessionToken: string) => Promise<AppsPaymentPrepareResult>;
  validateBeforePrepare: () => boolean;
  onPaymentError?: (error: AppsPaymentApiError) => void;
  onBack: () => void;
  onViewActivity: () => void;
};

const RESETTABLE_PREPARE_CODES = new Set([
  "PAYMENT_INTENT_EXPIRED",
  "ATTEMPT_PAYLOAD_MISMATCH",
  "ATTEMPT_CONFLICT",
  "PAYMENT_CREATION_FAILED",
  "TOSS_PAY_UNAVAILABLE",
  "TOSS_PAY_MAKE_FAILED",
]);

export function appsPaymentErrorMessage(error: AppsPaymentApiError) {
  const messages: Record<string, string> = {
    INVALID_REQUEST: "입력한 주문 정보를 다시 확인해주세요.",
    INVALID_PAYMENT_AMOUNT: "결제 금액을 확인하지 못했어요. 주문 정보를 다시 확인해주세요.",
    RACKET_NOT_AVAILABLE: "이 라켓은 현재 구매할 수 없어요. 라켓 선택을 다시 확인해주세요.",
    RACKET_RENTAL_DISABLED: "현재 이 라켓은 대여 운영이 중지됐어요.",
    RACKET_RENTAL_PRICE_INVALID: "대여 요금을 확인하지 못했어요.",
    RACKET_RENTAL_UNAVAILABLE: "현재 대여 가능한 라켓이 없어요.",
    PRODUCT_UNAVAILABLE: "선택한 스트링을 현재 주문할 수 없어요.",
    STRING_PRICE_INVALID: "스트링 가격을 확인하지 못했어요.",
    RACKET_UNAVAILABLE: "주문 확정 중 라켓 판매 상태가 변경됐어요.",
    RACKET_RENTAL_RESERVED: "현재 대여 중인 수량을 제외하면 라켓 재고가 부족해요.",
    RACKET_INSUFFICIENT_STOCK: "선택한 수량만큼 라켓 재고가 남아 있지 않아요.",
    PRODUCT_NOT_AVAILABLE: "선택한 스트링을 현재 주문할 수 없어요.",
    VARIANT_NOT_FOUND: "선택한 색상·게이지 조합을 찾을 수 없어요.",
    VARIANT_SOLD_OUT: "선택한 색상·게이지 조합이 품절됐어요.",
    VARIANT_INSUFFICIENT_STOCK: "선택한 수량만큼 스트링 옵션 재고가 남아 있지 않아요.",
    VISIT_SLOT_UNAVAILABLE: "선택한 방문 시간이 더 이상 예약 가능하지 않아요.",
    PACKAGE_PASS_UNAVAILABLE: "장착서비스 패키지를 적용할 수 없어 주문을 확정하지 못했어요.",
    ATTEMPT_PAYLOAD_MISMATCH: "결제 준비 후 주문 정보가 변경됐어요. 선택 내용을 다시 확인해주세요.",
    ATTEMPT_CONFLICT: "결제 시도 정보를 사용할 수 없어요. 주문 내용을 다시 확인해주세요.",
    PAYMENT_INTENT_EXPIRED: "결제 준비 시간이 만료됐어요. 다시 결제를 준비해주세요.",
    PAYMENT_CREATION_IN_PROGRESS: "결제 준비를 처리하고 있어요. 잠시 후 같은 결제를 다시 확인해주세요.",
    PAYMENT_EXECUTION_IN_PROGRESS: "결제 승인 처리가 진행 중이에요.",
    PAYMENT_CREATION_FAILED: "결제 준비에 실패했어요. 다시 시도해주세요.",
    PAYMENT_COMPLETION_FAILED: "결제 처리 결과를 확인하지 못했어요.",
    PAYMENT_FINALIZATION_SNAPSHOT_INVALID: "주문 확정 정보가 일치하지 않아 결제 상태를 확인하고 있어요.",
    PAYMENT_APPROVAL_UNAVAILABLE_IN_SANDBOX:
      "Sandbox 결제 인증 테스트가 완료됐어요. Sandbox에서는 실제 승인과 주문 생성은 진행되지 않습니다.",
    PAYMENT_STATE_CHANGED: "결제 상태가 변경됐어요. 현재 상태를 다시 확인해주세요.",
    PAYMENT_STATE_UNAVAILABLE: "현재 결제 상태를 확인할 수 없어요.",
    TOSS_PAY_UNAVAILABLE: "결제 준비에 실패했어요. 다시 시도해주세요.",
    TOSS_PAY_MAKE_FAILED: "결제 준비에 실패했어요. 다시 시도해주세요.",
    PAYMENT_LIVE_NOT_ENABLED: "라이브 결제 준비가 아직 활성화되지 않았어요.",
    PAYMENT_LIVE_EXECUTION_DISABLED: "라이브 결제 승인이 일시 중지되어 있어요.",
    AUTH_REQUIRED: "로그인 정보가 만료됐어요. 다시 로그인한 뒤 같은 결제 상태를 확인해주세요.",
    PAYMENT_CONFIGURATION_MISSING: "결제 서버 설정을 확인하고 있어요.",
  };
  return error.code
    ? messages[error.code] ?? "결제 처리 정보를 확인하지 못했어요. 잠시 후 다시 시도해주세요."
    : "결제 처리 정보를 확인하지 못했어요. 잠시 후 다시 시도해주세요.";
}

function stateMessage(state: AppsPaymentIntentState, rental = false) {
  if (state === "finalized") return rental ? "결제와 대여 접수가 완료됐어요." : "결제와 주문 접수가 완료됐어요.";
  if (state === "refunded") return "주문을 확정할 수 없어 결제가 환불되었습니다.";
  if (state === "failed" || state === "cancelled") return "결제가 완료되지 않았어요. 원하시면 새 결제를 다시 준비할 수 있습니다.";
  if (state === "reconciliation_required") {
    return "결제 처리 결과를 추가로 확인하고 있습니다. 중복 결제를 방지하기 위해 새 결제를 다시 시도하지 마세요.";
  }
  return "결제 처리가 진행 중이에요. 같은 결제를 다시 생성하지 않고 현재 상태를 확인해주세요.";
}

export default function AppsPaymentCheckoutPanel({
  paymentPurpose,
  paymentAttemptId,
  onPaymentAttemptIdChange,
  preparePayment,
  validateBeforePrepare,
  onPaymentError,
  onBack,
  onViewActivity,
}: Props) {
  const auth = useAppsInTossAuth();
  const [busy, setBusy] = useState<"login" | "prepare" | "authorize" | "complete" | null>(null);
  const [payToken, setPayToken] = useState<string | null>(null);
  const [summary, setSummary] = useState<AppsPaymentSummary | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [state, setState] = useState<AppsPaymentIntentState | null>(null);
  const [message, setMessage] = useState("");
  const authorizationLock = useRef(false);
  const completionLock = useRef(false);

  const login = async () => {
    if (busy || auth.status === "authenticated") return;
    setBusy("login");
    try {
      await auth.login();
    } catch (error) {
      setMessage(
        error instanceof AppsAuthApiError || error instanceof AppsLoginBridgeError
          ? "토스 로그인이 완료되지 않았어요. 다시 시도해주세요."
          : "로그인에 실패했어요.",
      );
    } finally {
      setBusy(null);
    }
  };

  const complete = async (attemptId: string, markerSaveFailed = false) => {
    if (completionLock.current || auth.status !== "authenticated") return;
    completionLock.current = true;
    setBusy("complete");
    setMessage("결제 처리 중이에요.");
    try {
      const result = await completeAppsPayment(auth.sessionToken, attemptId);
      setState(result.state);
      setMessage(stateMessage(result.state, paymentPurpose === "racket_rental"));
      if (["finalized", "refunded", "failed", "cancelled"].includes(result.state)) clearPendingAppsPayment();
    } catch (error) {
      if (error instanceof AppsPaymentApiError && error.code === "PAYMENT_APPROVAL_UNAVAILABLE_IN_SANDBOX") {
        clearPendingAppsPayment();
        setState("cancelled");
        setMessage(appsPaymentErrorMessage(error));
      } else {
        if (error instanceof AppsPaymentApiError) {
          if (error.status === 401 || error.code === "AUTH_REQUIRED") auth.clearSession();
          onPaymentError?.(error);
        }
        setMessage(
          markerSaveFailed
            ? "결제 인증은 완료됐습니다. 중복 결제를 시도하지 마세요."
            : error instanceof AppsPaymentApiError
              ? appsPaymentErrorMessage(error)
              : "결제 처리 결과를 확인하지 못했어요. 같은 결제를 다시 생성하지 않고 현재 결제 상태를 확인합니다.",
        );
      }
    } finally {
      completionLock.current = false;
      setBusy(null);
    }
  };

  const prepare = async () => {
    if (busy || auth.status !== "authenticated" || authorized || !validateBeforePrepare()) return;
    const attemptId = paymentAttemptId ?? crypto.randomUUID();
    if (!paymentAttemptId) onPaymentAttemptIdChange(attemptId);
    setBusy("prepare");
    setMessage("");
    try {
      const result = await preparePayment(attemptId, auth.sessionToken);
      setPayToken(result.payToken);
      setSummary(result.paymentSummary);
      setState(result.state);
      setMessage("실제 결제에 사용할 최종 금액을 확인해주세요.");
    } catch (error) {
      if (error instanceof AppsPaymentApiError) {
        if (error.status === 401 || error.code === "AUTH_REQUIRED") auth.clearSession();
        if (!readPendingAppsPayment() && RESETTABLE_PREPARE_CODES.has(error.code ?? "")) onPaymentAttemptIdChange(null);
        onPaymentError?.(error);
      }
      setMessage(error instanceof AppsPaymentApiError ? appsPaymentErrorMessage(error) : "결제 준비 정보를 확인하지 못했어요.");
    } finally {
      setBusy(null);
    }
  };

  const authorize = async () => {
    const attemptId = paymentAttemptId;
    if (authorizationLock.current || busy || authorized || auth.status !== "authenticated" || !payToken || !attemptId) return;
    authorizationLock.current = true;
    setBusy("authorize");
    setMessage("");
    try {
      if (!canStorePendingAppsPayment()) {
        setMessage("결제 복구 정보를 안전하게 저장할 수 없어 결제를 시작할 수 없습니다. 앱을 다시 실행한 뒤 시도해주세요.");
        return;
      }
      const intent = await getAppsPaymentIntent(auth.sessionToken, attemptId);
      if (intent.attemptId !== attemptId || intent.expired || intent.state !== "awaiting_authorization" || !intent.paymentReady) {
        if (intent.expired) {
          setPayToken(null);
          setSummary(null);
          onPaymentAttemptIdChange(null);
          setMessage("결제 준비 시간이 만료됐어요. 다시 결제를 준비해주세요.");
        } else {
          setMessage("결제 준비 상태를 다시 확인해주세요. 중복 결제를 시도하지 마세요.");
        }
        return;
      }
      const result = await checkoutPayment({ params: { payToken } });
      if (!result.success) {
        setMessage("결제 인증이 완료되지 않았어요. 다시 시도해주세요.");
        return;
      }
      setAuthorized(true);
      setPayToken(null);
      let markerSaveFailed = false;
      try {
        savePendingAppsPayment(attemptId);
        setMessage("구매자 인증이 완료되어 결제 처리 중이에요.");
      } catch {
        markerSaveFailed = true;
        setMessage("결제 인증은 완료됐습니다. 중복 결제를 시도하지 마세요.");
      }
      await complete(attemptId, markerSaveFailed);
    } catch (error) {
      if (error instanceof AppsPaymentApiError) {
        if (error.status === 401 || error.code === "AUTH_REQUIRED") auth.clearSession();
        if (error.code === "PAYMENT_INTENT_EXPIRED") {
          setPayToken(null);
          setSummary(null);
          onPaymentAttemptIdChange(null);
        }
        onPaymentError?.(error);
        setMessage(appsPaymentErrorMessage(error));
      } else {
        setMessage("토스페이 결제 인증을 시작하지 못했어요. 다시 시도해주세요.");
      }
    } finally {
      authorizationLock.current = false;
      setBusy(null);
    }
  };

  const terminal = state === "finalized" || state === "refunded";
  const retryableTerminal = state === "failed" || state === "cancelled";

  return (
    <section>
      <h1 className="text-[22px] font-extrabold">토스 로그인 및 결제 처리</h1>
      {message ? <p className="mt-3 break-keep rounded-2xl bg-[#f4f9e8] p-4 text-sm leading-[1.6]" role="status">{message}</p> : null}
      {summary ? (
        <section className="mt-4 rounded-[20px] border border-[#e5e8eb] p-[18px]">
          <strong>최종 결제 정보</strong>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt>상품명</dt><dd className="m-0 text-right">{summary.item.name}</dd></div>
            <div className="flex justify-between"><dt>수량</dt><dd className="m-0">{summary.item.quantity}개</dd></div>
            {summary.rental ? <><div className="flex justify-between"><dt>대여 기간</dt><dd className="m-0">{summary.rental.days}일</dd></div><div className="flex justify-between"><dt>대여료</dt><dd className="m-0">{formatPrice(summary.rental.rentalFee)}</dd></div><div className="flex justify-between"><dt>보증금</dt><dd className="m-0">{formatPrice(summary.rental.deposit)}</dd></div>{summary.rental.stringingRequested ? <><div className="flex justify-between"><dt>스트링 가격</dt><dd className="m-0">{formatPrice(summary.rental.stringPrice)}</dd></div><div className="flex justify-between"><dt>장착서비스 비용</dt><dd className="m-0">{formatPrice(summary.rental.serviceFee)}</dd></div></> : <div className="flex justify-between"><dt>교체서비스</dt><dd className="m-0">미신청</dd></div>}</> : <div className="flex justify-between"><dt>상품 금액</dt><dd className="m-0">{formatPrice(summary.pricing.subtotal)}</dd></div>}
            <div className="flex justify-between"><dt>배송비</dt><dd className="m-0">{formatPrice(summary.pricing.shippingFee)}</dd></div>
            {!summary.rental && <div className="flex justify-between"><dt>장착서비스 비용</dt><dd className="m-0">{formatPrice(summary.pricing.serviceFee)}</dd></div>}
            {summary.pricing.packageDiscount > 0 ? <div className="flex justify-between"><dt>패키지 할인</dt><dd className="m-0">-{formatPrice(summary.pricing.packageDiscount)}</dd></div> : null}
            <div className="flex justify-between border-t pt-3 font-extrabold"><dt>최종 결제 금액</dt><dd className="m-0">{formatPrice(summary.pricing.payableAmount)}</dd></div>
          </dl>
        </section>
      ) : null}
      {auth.status !== "authenticated" ? <button className="mt-4 min-h-[52px] w-full rounded-2xl bg-[#191f28] font-extrabold text-white disabled:bg-[#e5e8eb] disabled:text-[#8b95a1]" type="button" onClick={() => void login()} disabled={busy !== null}>{busy === "login" ? "로그인 중..." : "토스로 로그인하기"}</button> : null}
      {auth.status === "authenticated" && !summary && !authorized ? <button className="mt-4 min-h-[52px] w-full rounded-2xl bg-[#191f28] font-extrabold text-white disabled:bg-[#e5e8eb] disabled:text-[#8b95a1]" type="button" onClick={() => void prepare()} disabled={busy !== null}>{busy === "prepare" ? "결제 준비 중..." : "결제 준비 확인하기"}</button> : null}
      {summary && payToken && !authorized ? <button className="mt-4 min-h-[52px] w-full rounded-2xl bg-[#191f28] font-extrabold text-white disabled:bg-[#e5e8eb] disabled:text-[#8b95a1]" type="button" onClick={() => void authorize()} disabled={busy !== null}>토스페이로 {formatPrice(summary.pricing.payableAmount)} 결제 인증하기</button> : null}
      {authorized && !terminal && !retryableTerminal && auth.status === "authenticated" ? <button className="mt-4 min-h-[52px] w-full rounded-2xl bg-[#191f28] font-extrabold text-white disabled:bg-[#e5e8eb] disabled:text-[#8b95a1]" type="button" onClick={() => paymentAttemptId && void complete(paymentAttemptId)} disabled={busy !== null}>결제 처리 상태 다시 확인</button> : null}
      {state === "finalized" ? <button className="mt-4 min-h-[52px] w-full rounded-2xl bg-[#191f28] font-extrabold text-white" type="button" onClick={onViewActivity}>내 이용내역 보기</button> : null}
      {retryableTerminal ? <button className="mt-4 min-h-[52px] w-full rounded-2xl bg-[#191f28] font-extrabold text-white" type="button" onClick={() => { clearPendingAppsPayment(); onPaymentAttemptIdChange(null); setAuthorized(false); setState(null); setSummary(null); setMessage(""); }}>새 결제 다시 준비하기</button> : null}
      {!authorized && !terminal ? <button className="mt-3 min-h-[52px] w-full rounded-2xl border border-[#d1d6db] bg-white font-bold" type="button" onClick={onBack}>이전</button> : null}
    </section>
  );
}
