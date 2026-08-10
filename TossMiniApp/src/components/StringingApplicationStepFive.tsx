import { checkoutPayment } from "@apps-in-toss/web-framework";
import { Top } from "@toss/tds-mobile";
import { useRef, useState } from "react";

import { AppsAuthApiError } from "../api/auth";
import { AppsPaymentApiError, completeAppsPayment, getAppsPaymentIntent, prepareAppsPayment, type AppsPaymentIntentState, type AppsPaymentSummary } from "../api/payments";
import { AppsLoginBridgeError, useAppsInTossAuth } from "../auth/AppsInTossAuthContext";
import { canStorePendingAppsPayment, clearPendingAppsPayment, readPendingAppsPayment, savePendingAppsPayment } from "../lib/pending-payment";
import { formatPrice } from "../lib/product-labels";
import { getFirstInvalidApplicationStep } from "../lib/stringing-application-validation";
import type { StringingApplicantDraft, StringingCollectionMethod, StringingShippingDraft, StringingWorkDraft } from "../types/stringing";

type Props = { productId: string; selectedColor: string; selectedGauge: string; applicant: StringingApplicantDraft; collectionMethod: StringingCollectionMethod; shipping: StringingShippingDraft; work: StringingWorkDraft; paymentAttemptId: string | null; onPaymentAttemptIdChange: (value: string | null) => void; onInvalidStep: (step: 1 | 2 | 3) => void; onBack: () => void };

function errorMessage(error: AppsPaymentApiError) {
  const messages: Record<string, string> = {
    INVALID_REQUEST: "입력한 주문 정보를 다시 확인해주세요. 이전 단계로 돌아가 정보를 확인해주세요.", INVALID_PAYMENT_AMOUNT: "결제 금액을 확인하지 못했어요. 주문 정보를 다시 확인해주세요.",
    PAYMENT_INTENT_EXPIRED: "결제 준비 시간이 만료됐어요. 다시 확인해주세요.", ATTEMPT_PAYLOAD_MISMATCH: "주문 정보가 변경됐어요. 다시 결제 준비를 확인해주세요.", ATTEMPT_CONFLICT: "결제 준비 정보를 다시 확인해주세요.",
    VISIT_SLOT_UNAVAILABLE: "선택한 방문 시간이 더 이상 예약 가능하지 않아요. 이전 단계에서 시간을 다시 선택해주세요.", VARIANT_SOLD_OUT: "선택한 상품 옵션의 재고를 다시 확인해주세요.", VARIANT_INSUFFICIENT_STOCK: "선택한 상품 옵션의 재고를 다시 확인해주세요.",
    PRODUCT_NOT_AVAILABLE: "선택한 상품 옵션을 다시 확인해주세요.", VARIANT_NOT_FOUND: "선택한 상품 옵션을 다시 확인해주세요.", PAYMENT_CREATION_IN_PROGRESS: "결제 준비를 처리하고 있어요. 잠시 후 다시 확인해주세요.",
    PAYMENT_CREATION_FAILED: "결제 준비에 실패했어요. 다시 시도해주세요.", TOSS_PAY_UNAVAILABLE: "결제 준비에 실패했어요. 다시 시도해주세요.", TOSS_PAY_MAKE_FAILED: "결제 준비에 실패했어요. 다시 시도해주세요.",
    PAYMENT_LIVE_NOT_ENABLED: "라이브 결제 준비가 아직 활성화되지 않았어요.", PAYMENT_LIVE_EXECUTION_DISABLED: "라이브 결제 승인이 일시 중지되어 있어요.",
    PAYMENT_APPROVAL_UNAVAILABLE_IN_SANDBOX: "Sandbox 결제 인증 테스트가 완료됐어요. Sandbox에서는 실제 승인과 주문 생성은 진행되지 않습니다.",
    PAYMENT_EXECUTION_IN_PROGRESS: "결제 승인 처리가 진행 중이에요.", PAYMENT_COMPLETION_FAILED: "결제 처리 결과를 확인하지 못했어요.",
    PAYMENT_STATE_CHANGED: "결제 상태가 변경됐어요. 현재 상태를 다시 확인해주세요.", PAYMENT_STATE_UNAVAILABLE: "현재 결제 상태를 확인할 수 없어요.",
    AUTH_REQUIRED: "로그인 정보가 만료됐어요. 다시 로그인한 뒤 같은 결제 상태를 확인해주세요.", PAYMENT_CONFIGURATION_MISSING: "결제 서버 설정을 확인하고 있어요.",
  };
  return error.code ? messages[error.code] ?? "결제 처리 정보를 확인하지 못했어요. 잠시 후 다시 시도해주세요." : "결제 처리 정보를 확인하지 못했어요. 잠시 후 다시 시도해주세요.";
}

function stateMessage(state: AppsPaymentIntentState) {
  if (state === "finalized") return "결제와 주문 접수가 완료됐어요.";
  if (state === "refunded") return "주문을 확정할 수 없어 결제가 환불되었습니다.";
  if (state === "failed" || state === "cancelled") return "결제가 완료되지 않았어요. 원하시면 새 결제를 다시 준비할 수 있습니다.";
  if (state === "reconciliation_required") return "결제 처리 결과를 추가로 확인하고 있습니다. 중복 결제를 방지하기 위해 새 결제를 다시 시도하지 마세요.";
  return "결제 처리가 진행 중이에요. 같은 결제를 다시 생성하지 않고 현재 상태를 확인해주세요.";
}

export default function StringingApplicationStepFive(props: Props) {
  const auth = useAppsInTossAuth();
  const [busy, setBusy] = useState<"login" | "prepare" | "authorize" | "complete" | null>(null);
  const [payToken, setPayToken] = useState<string | null>(null);
  const [summary, setSummary] = useState<AppsPaymentSummary | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [state, setState] = useState<AppsPaymentIntentState | null>(null);
  const [message, setMessage] = useState("");
  const authorizationLock = useRef(false);
  const completionLock = useRef(false);

  const login = async () => { if (busy || auth.status === "authenticated") return; setBusy("login"); try { await auth.login(); } catch (error) { setMessage(error instanceof AppsAuthApiError || error instanceof AppsLoginBridgeError ? "토스 로그인이 완료되지 않았어요. 다시 시도해주세요." : "로그인에 실패했어요."); } finally { setBusy(null); } };

  const complete = async (attemptId: string, markerSaveFailed = false) => {
    if (completionLock.current || auth.status !== "authenticated") return;
    completionLock.current = true; setBusy("complete"); setMessage("결제 처리 중이에요.");
    try {
      const result = await completeAppsPayment(auth.sessionToken, attemptId);
      setState(result.state); setMessage(stateMessage(result.state));
      if (["finalized", "refunded", "failed", "cancelled"].includes(result.state)) clearPendingAppsPayment();
    } catch (error) {
      if (error instanceof AppsPaymentApiError && error.code === "PAYMENT_APPROVAL_UNAVAILABLE_IN_SANDBOX") { clearPendingAppsPayment(); setState("cancelled"); setMessage(errorMessage(error)); }
      else { if (error instanceof AppsPaymentApiError && (error.status === 401 || error.code === "AUTH_REQUIRED")) auth.clearSession(); setMessage(markerSaveFailed ? "결제 인증은 완료됐습니다. 중복 결제를 시도하지 마세요." : error instanceof AppsPaymentApiError ? errorMessage(error) : "결제 처리 결과를 확인하지 못했어요. 같은 결제를 다시 생성하지 않고 현재 결제 상태를 확인합니다."); }
    } finally { completionLock.current = false; setBusy(null); }
  };

  const prepare = async () => {
    if (busy || auth.status !== "authenticated" || authorized) return;
    const invalid = getFirstInvalidApplicationStep({ applicant: props.applicant, collectionMethod: props.collectionMethod, shipping: props.shipping, work: props.work }, { selectedColor: props.selectedColor, selectedGauge: props.selectedGauge });
    if (invalid) { props.onInvalidStep(invalid); return; }
    const attemptId = props.paymentAttemptId ?? crypto.randomUUID(); if (!props.paymentAttemptId) props.onPaymentAttemptIdChange(attemptId);
    setBusy("prepare"); setMessage("");
    try {
      const result = await prepareAppsPayment({ sessionToken: auth.sessionToken, attemptId, productId: props.productId, selectedColor: props.selectedColor, selectedGauge: props.selectedGauge, applicant: props.applicant, collectionMethod: props.collectionMethod, shipping: props.shipping, work: props.work });
      setPayToken(result.payToken); setSummary(result.paymentSummary); setState(result.state); setMessage("실제 결제에 사용할 최종 금액을 확인해주세요.");
    } catch (error) { if (error instanceof AppsPaymentApiError) { if (error.status === 401 || error.code === "AUTH_REQUIRED") auth.clearSession(); if (!readPendingAppsPayment() && ["PAYMENT_INTENT_EXPIRED", "ATTEMPT_PAYLOAD_MISMATCH", "ATTEMPT_CONFLICT", "PAYMENT_CREATION_FAILED", "TOSS_PAY_UNAVAILABLE", "TOSS_PAY_MAKE_FAILED"].includes(error.code ?? "")) props.onPaymentAttemptIdChange(null); } setMessage(error instanceof AppsPaymentApiError ? errorMessage(error) : "결제 준비 정보를 확인하지 못했어요."); }
    finally { setBusy(null); }
  };

  const authorize = async () => {
    const attemptId = props.paymentAttemptId;
    if (authorizationLock.current || busy || authorized || auth.status !== "authenticated" || !payToken || !attemptId) return;
    authorizationLock.current = true; setBusy("authorize"); setMessage("");
    try {
      if (!canStorePendingAppsPayment()) {
        setMessage("결제 복구 정보를 안전하게 저장할 수 없어 결제를 시작할 수 없습니다. 앱을 다시 실행한 뒤 시도해주세요.");
        return;
      }
      const intent = await getAppsPaymentIntent(auth.sessionToken, attemptId);
      if (intent.attemptId !== attemptId || intent.expired || intent.state !== "awaiting_authorization" || !intent.paymentReady) {
        if (intent.expired) {
          setPayToken(null); setSummary(null); props.onPaymentAttemptIdChange(null);
          setMessage("결제 준비 시간이 만료됐어요. 다시 결제를 준비해주세요.");
        } else {
          setMessage("결제 준비 상태를 다시 확인해주세요. 중복 결제를 시도하지 마세요.");
        }
        return;
      }
      const result = await checkoutPayment({ params: { payToken } });
      if (result.success) {
        setAuthorized(true); setPayToken(null);
        let markerSaveFailed = false;
        try {
          savePendingAppsPayment(attemptId);
          setMessage("구매자 인증이 완료되어 결제 처리 중이에요.");
        } catch {
          markerSaveFailed = true;
          setMessage("결제 인증은 완료됐습니다. 중복 결제를 시도하지 마세요.");
        }
        await complete(attemptId, markerSaveFailed);
      } else setMessage("결제 인증이 완료되지 않았어요. 다시 시도해주세요.");
    } catch (error) {
      if (error instanceof AppsPaymentApiError) {
        if (error.status === 401 || error.code === "AUTH_REQUIRED") auth.clearSession();
        if (error.code === "PAYMENT_INTENT_EXPIRED") {
          setPayToken(null); setSummary(null); props.onPaymentAttemptIdChange(null);
        }
        setMessage(errorMessage(error));
      } else {
        setMessage("토스페이 결제 인증을 시작하지 못했어요. 다시 시도해주세요.");
      }
    }
    finally { authorizationLock.current = false; setBusy(null); }
  };

  const terminal = state === "finalized" || state === "refunded";
  const retryableTerminal = state === "failed" || state === "cancelled";
  return <main className="min-h-dvh w-full bg-white pb-8 text-[#191f28]">
    <section className="pt-[calc(16px+env(safe-area-inset-top))]"><Top title={<Top.TitleParagraph size={22}>교체서비스 포함 주문</Top.TitleParagraph>} subtitleBottom={<Top.SubtitleParagraph size={17}>5 / 5 · 결제 확인</Top.SubtitleParagraph>} /></section>
    <section className="px-6"><h1 className="text-[22px] font-extrabold">토스 로그인 및 결제 처리</h1>
      {message && <p className="mt-3 break-keep rounded-2xl bg-[#f4f9e8] p-4 text-sm leading-[1.6]" role="status">{message}</p>}
      {summary && <section className="mt-4 rounded-[20px] border border-[#e5e8eb] p-[18px]"><strong>최종 결제 정보</strong><dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between"><dt>상품명</dt><dd>{summary.item.name}</dd></div><div className="flex justify-between"><dt>수량</dt><dd>{summary.item.quantity}개</dd></div>
        <div className="flex justify-between"><dt>상품 금액</dt><dd>{formatPrice(summary.pricing.subtotal)}</dd></div><div className="flex justify-between"><dt>배송비</dt><dd>{formatPrice(summary.pricing.shippingFee)}</dd></div>
        <div className="flex justify-between"><dt>교체서비스 비용</dt><dd>{formatPrice(summary.pricing.serviceFee)}</dd></div>{summary.pricing.packageDiscount > 0 && <div className="flex justify-between"><dt>패키지 할인</dt><dd>-{formatPrice(summary.pricing.packageDiscount)}</dd></div>}
        <div className="flex justify-between border-t pt-3 font-extrabold"><dt>최종 결제 금액</dt><dd>{formatPrice(summary.pricing.payableAmount)}</dd></div></dl></section>}
      {auth.status !== "authenticated" && <button className="mt-4 min-h-[52px] w-full rounded-2xl bg-[#191f28] font-extrabold text-white" onClick={() => void login()} disabled={busy !== null}>토스로 로그인하기</button>}
      {auth.status === "authenticated" && !summary && !authorized && <button className="mt-4 min-h-[52px] w-full rounded-2xl bg-[#191f28] font-extrabold text-white" onClick={() => void prepare()} disabled={busy !== null}>{busy === "prepare" ? "결제 준비 중..." : "결제 준비 확인하기"}</button>}
      {summary && payToken && !authorized && <button className="mt-4 min-h-[52px] w-full rounded-2xl bg-[#191f28] font-extrabold text-white" onClick={() => void authorize()} disabled={busy !== null}>토스페이로 {formatPrice(summary.pricing.payableAmount)} 결제 인증하기</button>}
      {authorized && !terminal && !retryableTerminal && auth.status === "authenticated" && <button className="mt-4 min-h-[52px] w-full rounded-2xl bg-[#191f28] font-extrabold text-white" onClick={() => props.paymentAttemptId && void complete(props.paymentAttemptId)} disabled={busy !== null}>결제 처리 상태 다시 확인</button>}
      {retryableTerminal && <button className="mt-4 min-h-[52px] w-full rounded-2xl bg-[#191f28] font-extrabold text-white" onClick={() => { clearPendingAppsPayment(); props.onPaymentAttemptIdChange(null); setAuthorized(false); setState(null); setSummary(null); setMessage(""); }}>새 결제 다시 준비하기</button>}
      {!authorized && !terminal && <button className="mt-3 min-h-[52px] w-full rounded-2xl border border-[#d1d6db] bg-white font-bold" onClick={props.onBack}>이전</button>}
    </section>
  </main>;
}
