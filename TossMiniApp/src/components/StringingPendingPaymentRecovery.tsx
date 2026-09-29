import { useRef, useState } from "react";

import { AppsAuthApiError } from "../api/auth";
import { AppsPaymentApiError, completeAppsPayment, type AppsPaymentIntentState } from "../api/payments";
import { AppsLoginBridgeError, useAppsInTossAuth } from "../auth/AppsInTossAuthContext";
import { clearPendingAppsPayment, type PendingAppsPayment } from "../lib/pending-payment";

type Props = { pending: PendingAppsPayment; onResolved: () => void };
type RecoveryResult = "finalized" | "refunded" | "retryable" | "sandbox" | null;

function messageForState(state: AppsPaymentIntentState) {
  if (state === "finalized") return "결제와 주문 접수가 완료됐어요.";
  if (state === "refunded") return "주문을 확정할 수 없어 결제가 환불되었습니다.";
  if (state === "failed" || state === "cancelled") return "결제가 완료되지 않았어요.";
  if (state === "reconciliation_required") return "결제 처리 결과를 추가로 확인하고 있습니다. 중복 결제를 방지하기 위해 새 결제를 다시 시도하지 마세요.";
  return "현재 결제 처리가 진행 중이에요. 같은 결제를 다시 생성하지 않고 상태를 확인해주세요.";
}

export default function StringingPendingPaymentRecovery({ pending, onResolved }: Props) {
  const auth = useAppsInTossAuth();
  const lock = useRef(false);
  const [message, setMessage] = useState("이전에 결제 인증을 완료한 건이 있습니다.");
  const [result, setResult] = useState<RecoveryResult>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  const login = async () => {
    if (loginBusy || auth.status === "authenticated") return;
    setLoginBusy(true);
    try {
      await auth.login();
    } catch (error) {
      setMessage(error instanceof AppsAuthApiError || error instanceof AppsLoginBridgeError ? "토스 로그인이 완료되지 않았어요. 다시 시도해주세요." : "로그인에 실패했어요.");
    } finally {
      setLoginBusy(false);
    }
  };

  const check = async () => {
    if (lock.current || auth.status !== "authenticated") return;
    lock.current = true;
    try {
      const result = await completeAppsPayment(auth.sessionToken, pending.attemptId);
      const resolved = ["finalized", "refunded", "failed", "cancelled"].includes(result.state);
      if (resolved) clearPendingAppsPayment();
      setResult(result.state === "finalized" ? "finalized" : result.state === "refunded" ? "refunded" : result.state === "failed" || result.state === "cancelled" ? "retryable" : null);
      setMessage(messageForState(result.state));
    } catch (error) {
      if (error instanceof AppsPaymentApiError && error.code === "PAYMENT_INTENT_NOT_FOUND") {
        clearPendingAppsPayment(); setResult("retryable"); setMessage("서버에서 이전 결제 건을 찾지 못했어요. 새 결제를 준비할 수 있습니다.");
      } else if (error instanceof AppsPaymentApiError && error.code === "PAYMENT_APPROVAL_UNAVAILABLE_IN_SANDBOX") {
        clearPendingAppsPayment(); setResult("sandbox"); setMessage("Sandbox 결제 인증 테스트가 완료됐어요. Sandbox에서는 실제 승인과 주문 생성은 진행되지 않습니다.");
      } else {
        if (error instanceof AppsPaymentApiError && (error.status === 401 || error.code === "AUTH_REQUIRED")) auth.clearSession();
        setMessage("결제 처리 결과를 확인하지 못했어요. 같은 결제를 다시 생성하지 않고 현재 결제 상태를 확인합니다.");
      }
    } finally { lock.current = false; }
  };

  return <main className="min-h-dvh bg-white px-6 pt-[calc(48px+env(safe-area-inset-top))] text-[#191f28]">
    <h1 className="text-[22px] font-extrabold">결제 처리 상태 확인</h1>
    <p className="mt-4 break-keep text-sm leading-[1.6] text-[#6b7684]">{message}</p>
    {auth.status !== "authenticated" && <>
      <p className="mt-3 text-sm text-[#6b7684]">결제 상태를 확인하려면 토스 로그인이 필요해요.</p>
      <button className="mt-5 min-h-[52px] w-full rounded-2xl bg-[#191f28] text-base font-extrabold text-white disabled:bg-[#e5e8eb] disabled:text-[#8b95a1]" type="button" onClick={() => void login()} disabled={loginBusy}>{loginBusy ? "로그인 중..." : "토스로 로그인하기"}</button>
    </>}
    {auth.status === "authenticated" && !result && <button className="mt-5 min-h-[52px] w-full rounded-2xl bg-[#191f28] text-base font-extrabold text-white" type="button" onClick={() => void check()}>결제 처리 상태 확인</button>}
    {result === "finalized" && <button className="mt-5 min-h-[52px] w-full rounded-2xl border border-[#d1d6db] bg-white text-base font-bold" type="button" onClick={onResolved}>주문 화면으로 돌아가기</button>}
    {result === "refunded" && <button className="mt-5 min-h-[52px] w-full rounded-2xl border border-[#d1d6db] bg-white text-base font-bold" type="button" onClick={onResolved}>주문 내용 다시 확인하기</button>}
    {(result === "retryable" || result === "sandbox") && <button className="mt-5 min-h-[52px] w-full rounded-2xl border border-[#d1d6db] bg-white text-base font-bold" type="button" onClick={onResolved}>{result === "retryable" ? "새 결제 다시 준비하기" : "주문 화면으로 돌아가기"}</button>}
  </main>;
}
