import { Top } from "@toss/tds-mobile";

import { prepareAppsPayment } from "../api/payments";
import { getFirstInvalidApplicationStep } from "../lib/stringing-application-validation";
import type {
  StringingApplicantDraft,
  StringingCollectionMethod,
  StringingShippingDraft,
  StringingWorkDraft,
} from "../types/stringing";
import AppsPaymentCheckoutPanel from "./AppsPaymentCheckoutPanel";

type Props = {
  productId: string;
  selectedColor: string;
  selectedGauge: string;
  applicant: StringingApplicantDraft;
  collectionMethod: StringingCollectionMethod;
  shipping: StringingShippingDraft;
  work: StringingWorkDraft;
  paymentAttemptId: string | null;
  onPaymentAttemptIdChange: (value: string | null) => void;
  onInvalidStep: (step: 1 | 2 | 3) => void;
  onBack: () => void;
  onViewActivity: () => void;
};

export default function StringingApplicationStepFive(props: Props) {
  const validateBeforePrepare = () => {
    const invalid = getFirstInvalidApplicationStep(
      {
        applicant: props.applicant,
        collectionMethod: props.collectionMethod,
        shipping: props.shipping,
        work: props.work,
      },
      { selectedColor: props.selectedColor, selectedGauge: props.selectedGauge },
    );
    if (invalid) {
      props.onInvalidStep(invalid);
      return false;
    }
    return true;
  };

  return (
    <main className="min-h-dvh w-full bg-white pb-8 text-[#191f28]">
      <section className="pt-[calc(16px+env(safe-area-inset-top))]">
        <Top
          title={<Top.TitleParagraph size={22}>교체서비스 포함 주문</Top.TitleParagraph>}
          subtitleBottom={<Top.SubtitleParagraph size={17}>5 / 5 · 결제 확인</Top.SubtitleParagraph>}
        />
      </section>
      <div className="px-6 max-[359px]:px-5">
        <AppsPaymentCheckoutPanel
          paymentAttemptId={props.paymentAttemptId}
          onPaymentAttemptIdChange={props.onPaymentAttemptIdChange}
          validateBeforePrepare={validateBeforePrepare}
          preparePayment={(attemptId, sessionToken) =>
            prepareAppsPayment({
              sessionToken,
              attemptId,
              productId: props.productId,
              selectedColor: props.selectedColor,
              selectedGauge: props.selectedGauge,
              applicant: props.applicant,
              collectionMethod: props.collectionMethod,
              shipping: props.shipping,
              work: props.work,
            })
          }
          onBack={props.onBack}
          onViewActivity={props.onViewActivity}
        />
      </div>
    </main>
  );
}
