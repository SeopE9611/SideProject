import { useCallback, useEffect, useState } from "react";

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

  useEffect(() => {
    const handlePopState = () => {
      setCurrentStep(getApplyStepFromLocation());

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
  }, []);

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

  if (currentStep === 5) {
    return <StringingApplicationStepFive onBack={handleBack} />;
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
        onContinue={() => pushStep(5)}
      />
    );
  }

  if (currentStep === 3) {
    return (
      <StringingApplicationStepThree
        collectionMethod={collectionMethod}
        work={work}
        onWorkChange={setWork}
        onBack={handleBack}
        onContinue={() => pushStep(4)}
      />
    );
  }

  if (currentStep === 2) {
    return (
      <StringingApplicationStepTwo
        collectionMethod={collectionMethod}
        onCollectionMethodChange={setCollectionMethod}
        shipping={shipping}
        onShippingChange={setShipping}
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
      onApplicantChange={setApplicant}
      onContinue={() => pushStep(2)}
    />
  );
}

export default StringingApplicationFlow;
