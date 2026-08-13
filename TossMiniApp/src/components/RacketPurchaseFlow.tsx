import { useCallback, useEffect, useState } from "react";

import type { AppsPaymentApiError } from "../api/payments";
import { getRacketAvailability, getRacketDetail } from "../api/rackets";
import { readPendingAppsPayment, type PendingAppsPayment } from "../lib/pending-payment";
import { racketBrandLabel } from "../lib/racket-labels";
import { validateApplicant, validateShipping, validateWork } from "../lib/stringing-application-validation";
import type { Product } from "../types/product";
import type { RacketPurchaseDraft, RacketPurchaseWorkDraft } from "../types/racket-purchase";
import type { StringingApplicantDraft, StringingCollectionMethod, StringingShippingDraft, StringingWorkDraft } from "../types/stringing";
import RacketPurchaseStepFive from "./RacketPurchaseStepFive";
import RacketPurchaseStepOne from "./RacketPurchaseStepOne";
import RacketPurchaseStepSix from "./RacketPurchaseStepSix";
import RacketPurchaseStepTwo from "./RacketPurchaseStepTwo";
import StringingApplicationStepThree from "./StringingApplicationStepThree";
import StringingApplicationStepTwo from "./StringingApplicationStepTwo";
import StringingPendingPaymentRecovery from "./StringingPendingPaymentRecovery";

type PurchaseStep = 1 | 2 | 3 | 4 | 5 | 6;
type LoadState = "loading" | "success" | "error";

const EMPTY_APPLICANT: StringingApplicantDraft = { name: "", email: "", phone: "" };
const EMPTY_SHIPPING: StringingShippingDraft = { postalCode: "", address: "", addressDetail: "" };
const EMPTY_WORK: RacketPurchaseWorkDraft = {
  tensionMain: "",
  tensionCross: "",
  note: "",
  preferredDate: "",
  preferredTime: "",
};

function getStepFromLocation(): PurchaseStep {
  const value = Number(new URLSearchParams(window.location.search).get("step"));
  return value >= 1 && value <= 6 ? (value as PurchaseStep) : 1;
}

function hasEnoughStringStock(draft: RacketPurchaseDraft) {
  const product = draft.stringProduct;
  if (!product || !draft.selectedColor || !draft.selectedGauge) return false;
  const variants = product.variantInventories ?? [];
  if (variants.length) {
    const variant = variants.find((row) => row.colorValue === draft.selectedColor && row.gaugeValue === draft.selectedGauge);
    return Boolean(variant && variant.isSoldOut !== true && Number(variant.stock ?? 0) >= draft.quantity);
  }
  const gauge = product.gaugeInventories?.find((row) => row.value === draft.selectedGauge);
  const color = product.colorInventories?.find((row) => row.value === draft.selectedColor);
  if (gauge && (gauge.isSoldOut || Number(gauge.stock ?? 0) < draft.quantity)) return false;
  if (color && (color.isSoldOut || Number(color.stock ?? 0) < draft.quantity)) return false;
  return product.inventory?.manageStock !== true || Number(product.inventory.stock ?? 0) >= draft.quantity;
}

function workForValidation(draft: RacketPurchaseDraft): StringingWorkDraft {
  return {
    racketType: `${racketBrandLabel(draft.racket?.brand)} ${draft.racket?.model ?? ""}`.trim(),
    ...draft.work,
  };
}

export default function RacketPurchaseFlow({
  racketId,
  onBackToDetail,
  onViewActivity,
}: {
  racketId: string;
  onBackToDetail: () => void;
  onViewActivity: () => void;
}) {
  const [currentStep, setCurrentStep] = useState<PurchaseStep>(() => getStepFromLocation());
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [draft, setDraft] = useState<RacketPurchaseDraft>({
    racketId,
    racket: null,
    availability: null,
    quantity: 1,
    stringProductId: "",
    stringProduct: null,
    selectedColor: "",
    selectedGauge: "",
    applicant: EMPTY_APPLICANT,
    collectionMethod: "self_ship",
    shipping: EMPTY_SHIPPING,
    work: EMPTY_WORK,
  });
  const [validatedWork, setValidatedWork] = useState<RacketPurchaseWorkDraft | null>(null);
  const [paymentAttemptId, setPaymentAttemptId] = useState<string | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PendingAppsPayment | null>(() => readPendingAppsPayment());
  const [stepError, setStepError] = useState<{ step: PurchaseStep; message: string } | null>(null);

  const loadRacket = useCallback(async (signal?: AbortSignal) => {
    setLoadState("loading");
    try {
      const [racket, availability] = await Promise.all([
        getRacketDetail(racketId, signal),
        getRacketAvailability(racketId, signal),
      ]);
      if (signal?.aborted) return;
      setDraft((current) => ({ ...current, racketId, racket, availability, quantity: Math.min(current.quantity, Math.max(1, availability.available)) }));
      setLoadState("success");
    } catch {
      if (!signal?.aborted) setLoadState("error");
    }
  }, [racketId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadRacket(controller.signal);
    return () => controller.abort();
  }, [loadRacket]);

  useEffect(() => {
    if (getStepFromLocation() === 1) return;
    const normalized = new URL(window.location.href);
    normalized.searchParams.set("step", "1");
    window.history.replaceState({ view: "racket-purchase", racketId, step: 1 }, "", `${normalized.pathname}${normalized.search}${normalized.hash}`);
    setCurrentStep(1);
  }, [racketId]);

  const selectionValid = Boolean(
    draft.racket &&
      draft.availability &&
      draft.availability.available >= draft.quantity &&
      draft.quantity >= 1 &&
      draft.quantity <= 10 &&
      hasEnoughStringStock(draft),
  );
  const applicantValid = Object.keys(validateApplicant(draft.applicant)).length === 0;
  const shippingValid = Object.keys(validateShipping(draft.collectionMethod, draft.shipping)).length === 0;
  const workValid = Boolean(draft.racket && Object.keys(validateWork(draft.collectionMethod, workForValidation(draft))).length === 0);

  const getAllowedStep = useCallback((requested: PurchaseStep): PurchaseStep => {
    if (requested === 1) return 1;
    if (!selectionValid) return 1;
    if (requested === 2) return 2;
    if (!applicantValid) return 2;
    if (requested === 3) return 3;
    if (!shippingValid) return 3;
    if (requested === 4) return 4;
    if (!workValid || validatedWork !== draft.work) return 4;
    return requested;
  }, [applicantValid, draft.work, selectionValid, shippingValid, validatedWork, workValid]);

  useEffect(() => {
    const handlePopState = () => {
      const pending = readPendingAppsPayment();
      if (pending) {
        setPendingPayment(pending);
        return;
      }
      const requested = getStepFromLocation();
      const allowed = getAllowedStep(requested);
      if (allowed !== requested) {
        const guarded = new URL(window.location.href);
        guarded.searchParams.set("step", String(allowed));
        window.history.replaceState({ view: "racket-purchase", racketId, step: allowed }, "", `${guarded.pathname}${guarded.search}${guarded.hash}`);
      }
      setCurrentStep(allowed);
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [getAllowedStep, racketId]);

  const pushStep = useCallback((step: PurchaseStep) => {
    const next = new URL(window.location.href);
    next.searchParams.set("view", "racket-purchase");
    next.searchParams.set("racketId", racketId);
    next.searchParams.set("step", String(step));
    window.history.pushState({ view: "racket-purchase", racketId, step }, "", `${next.pathname}${next.search}${next.hash}`);
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [racketId]);

  const guardMutation = useCallback(() => {
    const pending = readPendingAppsPayment();
    if (pending) {
      setPendingPayment(pending);
      return false;
    }
    setPaymentAttemptId(null);
    return true;
  }, []);

  const changeQuantity = useCallback((quantity: number) => {
    if (!guardMutation()) return;
    setDraft((current) => current.quantity === quantity ? current : { ...current, quantity, selectedColor: "", selectedGauge: "" });
  }, [guardMutation]);

  const changeString = useCallback((productId: string, product: Product | null, color: string, gauge: string) => {
    if (!guardMutation()) return;
    setDraft((current) => {
      if (current.stringProductId === productId && current.stringProduct === product && current.selectedColor === color && current.selectedGauge === gauge) return current;
      return { ...current, stringProductId: productId, stringProduct: product, selectedColor: color, selectedGauge: gauge };
    });
  }, [guardMutation]);

  const changeApplicant = useCallback((applicant: StringingApplicantDraft) => {
    if (!guardMutation()) return;
    setDraft((current) => ({ ...current, applicant }));
  }, [guardMutation]);

  const changeCollectionMethod = useCallback((collectionMethod: StringingCollectionMethod) => {
    if (!guardMutation()) return;
    setValidatedWork(null);
    setDraft((current) => ({
      ...current,
      collectionMethod,
      shipping: collectionMethod === "visit" ? EMPTY_SHIPPING : current.shipping,
      work: collectionMethod === "self_ship" ? { ...current.work, preferredDate: "", preferredTime: "" } : current.work,
    }));
  }, [guardMutation]);

  const changeShipping = useCallback((shipping: StringingShippingDraft) => {
    if (!guardMutation()) return;
    setDraft((current) => ({ ...current, shipping }));
  }, [guardMutation]);

  const changeWork = useCallback((work: StringingWorkDraft) => {
    if (!guardMutation()) return;
    setValidatedWork(null);
    setDraft((current) => ({
      ...current,
      work: {
        tensionMain: work.tensionMain,
        tensionCross: work.tensionCross,
        note: work.note,
        preferredDate: work.preferredDate,
        preferredTime: work.preferredTime,
      },
    }));
  }, [guardMutation]);

  const routeWithError = useCallback((step: PurchaseStep, message: string) => {
    setStepError({ step, message });
    pushStep(step);
  }, [pushStep]);

  const handlePaymentError = useCallback((error: AppsPaymentApiError) => {
    const pending = readPendingAppsPayment();
    if (pending) {
      setPendingPayment(pending);
      return;
    }
    const code = error.code ?? "";
    if (["RACKET_NOT_AVAILABLE", "RACKET_UNAVAILABLE", "RACKET_RENTAL_RESERVED", "RACKET_INSUFFICIENT_STOCK", "PRODUCT_NOT_AVAILABLE", "VARIANT_NOT_FOUND", "VARIANT_SOLD_OUT", "VARIANT_INSUFFICIENT_STOCK"].includes(code)) {
      routeWithError(1, "재고 또는 옵션 상태가 변경됐어요. 수량과 스트링 옵션을 다시 선택해주세요.");
    } else if (code === "VISIT_SLOT_UNAVAILABLE") {
      routeWithError(4, "선택한 방문 시간을 더 이상 예약할 수 없어요. 날짜와 시간을 다시 선택해주세요.");
    } else if (code === "PACKAGE_PASS_UNAVAILABLE" || code === "ATTEMPT_PAYLOAD_MISMATCH") {
      routeWithError(5, "주문 구성을 다시 확인한 뒤 결제를 준비해주세요.");
    }
  }, [routeWithError]);

  const handlePendingResolved = useCallback(() => {
    setPendingPayment(null);
    setPaymentAttemptId(null);
    setStepError(null);
    const next = new URL(window.location.href);
    next.searchParams.set("step", "1");
    window.history.replaceState({ view: "racket-purchase", racketId, step: 1 }, "", `${next.pathname}${next.search}${next.hash}`);
    setCurrentStep(1);
  }, [racketId]);

  if (pendingPayment) return <StringingPendingPaymentRecovery pending={pendingPayment} onResolved={handlePendingResolved} />;
  if (loadState === "loading") return <main className="min-h-dvh bg-white px-6 pt-[calc(32px+env(safe-area-inset-top))]" aria-label="라켓 구매 정보를 불러오는 중"><div className="h-24 rounded-[20px] bg-[#f2f4f6]" /><div className="mt-5 h-64 rounded-[20px] bg-[#f2f4f6]" /></main>;
  if (loadState === "error" || !draft.racket || !draft.availability) return <main className="min-h-dvh bg-white px-6 pt-[calc(32px+env(safe-area-inset-top))]"><div role="alert" className="rounded-[20px] bg-[#f2f4f6] p-6 text-center"><b>라켓 구매 정보를 불러오지 못했어요.</b><div className="mt-4 flex gap-2"><button type="button" className="min-h-11 flex-1 rounded-xl border border-[#d1d6db] bg-white font-bold" onClick={onBackToDetail}>라켓 상세로</button><button type="button" className="min-h-11 flex-1 rounded-xl border-0 bg-[#191f28] font-bold text-white" onClick={() => void loadRacket()}>다시 시도</button></div></div></main>;
  if (draft.availability.available < 1) return <main className="min-h-dvh bg-white px-6 pt-[calc(32px+env(safe-area-inset-top))]"><div role="alert" className="rounded-[20px] bg-[#f2f4f6] p-6 text-center"><b>현재 구매 가능한 라켓이 없어요.</b><button type="button" className="mt-4 min-h-11 w-full rounded-xl border border-[#d1d6db] bg-white font-bold" onClick={onBackToDetail}>라켓 상세로</button></div></main>;

  const message = stepError?.step === currentStep ? stepError.message : "";
  const back = () => window.history.back();

  if (currentStep === 6) return <RacketPurchaseStepSix draft={draft} paymentAttemptId={paymentAttemptId} onPaymentAttemptIdChange={setPaymentAttemptId} onInvalidStep={routeWithError} onPaymentError={handlePaymentError} onBack={back} onViewActivity={onViewActivity} />;
  if (currentStep === 5) return <RacketPurchaseStepFive draft={draft} errorMessage={message} onEdit={pushStep} onBack={back} onContinue={() => { setStepError(null); pushStep(6); }} />;
  if (currentStep === 4) return <StringingApplicationStepThree mode="racket-purchase" quantity={draft.quantity} errorMessage={message} collectionMethod={draft.collectionMethod} work={workForValidation(draft)} onWorkChange={changeWork} onBack={back} onContinue={() => { setValidatedWork(draft.work); setStepError(null); pushStep(5); }} />;
  if (currentStep === 3) return <StringingApplicationStepTwo mode="racket-purchase" errorMessage={message} collectionMethod={draft.collectionMethod} onCollectionMethodChange={changeCollectionMethod} shipping={draft.shipping} onShippingChange={changeShipping} onBack={back} onContinue={() => { setStepError(null); pushStep(4); }} />;
  if (currentStep === 2) return <RacketPurchaseStepTwo applicant={draft.applicant} errorMessage={message} onApplicantChange={changeApplicant} onBack={back} onContinue={() => { setStepError(null); pushStep(3); }} />;
  return <RacketPurchaseStepOne racket={draft.racket} availability={draft.availability} quantity={draft.quantity} stringProductId={draft.stringProductId} stringProduct={draft.stringProduct} selectedColor={draft.selectedColor} selectedGauge={draft.selectedGauge} errorMessage={message} onQuantityChange={changeQuantity} onStringChange={changeString} onBack={onBackToDetail} onContinue={() => { setStepError(null); pushStep(2); }} />;
}
