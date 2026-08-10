import { useCallback, useEffect, useState } from "react";

import { getFirstInvalidApplicationStep } from "../lib/stringing-application-validation";
import { readPendingAppsPayment, type PendingAppsPayment } from "../lib/pending-payment";
import type {
  StringingApplicantDraft,
  StringingCollectionMethod,
  StringingShippingDraft,
  StringingWorkDraft,
} from "../types/stringing";
import StringingApplicationStepFour from "./StringingApplicationStepFour";
import StringingApplicationStepFive from "./StringingApplicationStepFive";
import StringingApplicationStepOne from "./StringingApplicationStepOne";
import StringingApplicationStepThree from "./StringingApplicationStepThree";
import StringingApplicationStepTwo from "./StringingApplicationStepTwo";
import StringingPendingPaymentRecovery from "./StringingPendingPaymentRecovery";

type StringingApplicationFlowProps = {
  productId: string;
  selectedColor: string;
  selectedGauge: string;
};

type ApplyStep = 1 | 2 | 3 | 4 | 5;

const EMPTY_APPLICANT: StringingApplicantDraft = {
  name: "",
  email: "",
  phone: "",
};

const EMPTY_SHIPPING: StringingShippingDraft = {
  postalCode: "",
  address: "",
  addressDetail: "",
};

const EMPTY_WORK: StringingWorkDraft = {
  racketType: "",
  tensionMain: "",
  tensionCross: "",
  note: "",
  preferredDate: "",
  preferredTime: "",
};

function getApplyStepFromLocation(): ApplyStep {
  const step = new URLSearchParams(window.location.search).get("step");

  if (step === "5") return 5;
  if (step === "4") return 4;
  if (step === "3") return 3;
  if (step === "2") return 2;

  return 1;
}

function StringingApplicationFlow({ productId, selectedColor, selectedGauge }: StringingApplicationFlowProps) {
  const [currentStep, setCurrentStep] = useState<ApplyStep>(() => getApplyStepFromLocation());

  const [applicant, setApplicant] = useState<StringingApplicantDraft>(EMPTY_APPLICANT);

  const [collectionMethod, setCollectionMethod] = useState<StringingCollectionMethod>("self_ship");

  const [shipping, setShipping] = useState<StringingShippingDraft>(EMPTY_SHIPPING);

  const [work, setWork] = useState<StringingWorkDraft>(EMPTY_WORK);

  const [paymentAttemptId, setPaymentAttemptId] = useState<string | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PendingAppsPayment | null>(() => readPendingAppsPayment());
  const [validatedWork, setValidatedWork] = useState<StringingWorkDraft | null>(null);
  const [validationReturnStep, setValidationReturnStep] = useState<1 | 2 | 3 | null>(null);

  useEffect(() => {
    const pending = readPendingAppsPayment();
    if (pending) {
      setPendingPayment(pending);
      return;
    }
    setPaymentAttemptId(null);
  }, [productId, selectedColor, selectedGauge]);

  useEffect(() => {
    const initialStep = getApplyStepFromLocation();

    if (initialStep === 1) {
      return;
    }

    /*
     * 신청자/주소 같은 개인정보를
     * URL이나 영구 저장소에 저장하지 않는다.
     *
     * Step 2/3/4/5에서 페이지 자체가 새로고침되면
     * 메모리 draft가 사라지므로 Step 1로
     * 안전하게 복귀시킨다.
     */
    const normalizedUrl = new URL(window.location.href);

    normalizedUrl.searchParams.delete("step");

    window.history.replaceState(
      {
        productId,
        view: "stringing-checkout",
        step: 1,
      },
      "",
      `${normalizedUrl.pathname}${normalizedUrl.search}${normalizedUrl.hash}`,
    );

    setCurrentStep(1);
  }, [productId]);

  const getAllowedStep = useCallback((requestedStep: ApplyStep): ApplyStep => {
    if (requestedStep === 1) return 1;

    const invalidStep = getFirstInvalidApplicationStep(
      { applicant, collectionMethod, shipping, work },
      { selectedColor, selectedGauge },
    );
    if (invalidStep && invalidStep < requestedStep) return invalidStep;
    if (requestedStep >= 4 && validatedWork !== work) return 3;
    return requestedStep;
  }, [applicant, collectionMethod, selectedColor, selectedGauge, shipping, validatedWork, work]);

  useEffect(() => {
    const handlePopState = () => {
      const pending = readPendingAppsPayment();
      if (pending) {
        setPendingPayment(pending);
        return;
      }
      const requestedStep = getApplyStepFromLocation();
      const allowedStep = getAllowedStep(requestedStep);

      if (allowedStep !== requestedStep) {
        setValidationReturnStep(allowedStep as 1 | 2 | 3);
        const guardedUrl = new URL(window.location.href);
        guardedUrl.searchParams.set("step", String(allowedStep));
        window.history.replaceState({ productId, view: "stringing-checkout", step: allowedStep }, "", `${guardedUrl.pathname}${guardedUrl.search}${guardedUrl.hash}`);
      }
      setCurrentStep(allowedStep);

      requestAnimationFrame(() => {
        window.scrollTo({
          top: 0,
          behavior: "auto",
        });
      });
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [getAllowedStep, productId]);

  const pushStep = useCallback(
    (step: ApplyStep) => {
      const nextUrl = new URL(window.location.href);

      nextUrl.searchParams.set("step", String(step));

      window.history.pushState(
        {
          productId,
          view: "stringing-checkout",
          step,
        },
        "",
        `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
      );

      setCurrentStep(step);

      window.scrollTo({
        top: 0,
        behavior: "auto",
      });
    },
    [productId],
  );

  const handleBack = useCallback(() => {
    window.history.back();
  }, []);

  const handleApplicantChange = useCallback((nextApplicant: StringingApplicantDraft) => {
    const pending = readPendingAppsPayment();
    if (pending) { setPendingPayment(pending); return; }
    setApplicant(nextApplicant);
    setPaymentAttemptId(null);
  }, []);

  const handleCollectionMethodChange = useCallback((nextMethod: StringingCollectionMethod) => {
    const pending = readPendingAppsPayment();
    if (pending) { setPendingPayment(pending); return; }
    setCollectionMethod(nextMethod);
    setValidatedWork(null);
    setPaymentAttemptId(null);
  }, []);

  const handleShippingChange = useCallback((nextShipping: StringingShippingDraft) => {
    const pending = readPendingAppsPayment();
    if (pending) { setPendingPayment(pending); return; }
    setShipping(nextShipping);
    setPaymentAttemptId(null);
  }, []);

  const handleWorkChange = useCallback((nextWork: StringingWorkDraft) => {
    const pending = readPendingAppsPayment();
    if (pending) { setPendingPayment(pending); return; }
    setWork(nextWork);
    setValidatedWork(null);
    setPaymentAttemptId(null);
  }, []);

  const returnToInvalidStep = useCallback((step: 1 | 2 | 3) => {
    setValidationReturnStep(step);
    pushStep(step);
  }, [pushStep]);

  const handleReviewContinue = useCallback(() => {
    const invalidStep = getFirstInvalidApplicationStep(
      { applicant, collectionMethod, shipping, work },
      { selectedColor, selectedGauge },
    );
    if (invalidStep || validatedWork !== work) {
      const step = invalidStep ?? 3;
      setValidationReturnStep(step);
      pushStep(step);
      return;
    }
    pushStep(5);
  }, [applicant, collectionMethod, pushStep, selectedColor, selectedGauge, shipping, validatedWork, work]);

  if (pendingPayment) {
    return <StringingPendingPaymentRecovery pending={pendingPayment} onResolved={() => setPendingPayment(null)} />;
  }

  if (currentStep === 5) {
    return (
      <StringingApplicationStepFive
        productId={productId}
        selectedColor={selectedColor}
        selectedGauge={selectedGauge}
        applicant={applicant}
        collectionMethod={collectionMethod}
        shipping={shipping}
        work={work}
        paymentAttemptId={paymentAttemptId}
        onPaymentAttemptIdChange={setPaymentAttemptId}
        onInvalidStep={returnToInvalidStep}
        onBack={handleBack}
      />
    );
  }

  if (currentStep === 4) {
    return (
      <StringingApplicationStepFour
        productId={productId}
        selectedColor={selectedColor}
        selectedGauge={selectedGauge}
        applicant={applicant}
        collectionMethod={collectionMethod}
        shipping={shipping}
        work={work}
        onBack={handleBack}
        onContinue={handleReviewContinue}
      />
    );
  }

  if (currentStep === 3) {
    return (
      <StringingApplicationStepThree
        collectionMethod={collectionMethod}
        work={work}
        onWorkChange={handleWorkChange}
        showValidationErrors={validationReturnStep === 3}
        onBack={handleBack}
        onContinue={() => {
          setValidatedWork(work);
          pushStep(4);
        }}
      />
    );
  }

  if (currentStep === 2) {
    return (
      <StringingApplicationStepTwo
        collectionMethod={collectionMethod}
        onCollectionMethodChange={handleCollectionMethodChange}
        shipping={shipping}
        onShippingChange={handleShippingChange}
        showValidationErrors={validationReturnStep === 2}
        onBack={handleBack}
        onContinue={() => pushStep(3)}
      />
    );
  }

  return (
    <StringingApplicationStepOne
      productId={productId}
      selectedColor={selectedColor}
      selectedGauge={selectedGauge}
      applicant={applicant}
      onApplicantChange={handleApplicantChange}
      showValidationErrors={validationReturnStep === 1}
      onContinue={() => pushStep(2)}
    />
  );
}

export default StringingApplicationFlow;
