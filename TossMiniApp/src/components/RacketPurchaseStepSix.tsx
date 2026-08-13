import { Top } from "@toss/tds-mobile";

import { type AppsPaymentApiError, prepareRacketPurchasePayment } from "../api/payments";
import { racketBrandLabel } from "../lib/racket-labels";
import { validateApplicant, validateShipping, validateWork } from "../lib/stringing-application-validation";
import type { RacketPurchaseDraft } from "../types/racket-purchase";
import AppsPaymentCheckoutPanel from "./AppsPaymentCheckoutPanel";

type Props = {
  draft: RacketPurchaseDraft;
  paymentAttemptId: string | null;
  onPaymentAttemptIdChange: (value: string | null) => void;
  onInvalidStep: (step: 1 | 2 | 3 | 4 | 5, message: string) => void;
  onPaymentError: (error: AppsPaymentApiError) => void;
  onBack: () => void;
  onViewActivity: () => void;
};

export default function RacketPurchaseStepSix({
  draft,
  paymentAttemptId,
  onPaymentAttemptIdChange,
  onInvalidStep,
  onPaymentError,
  onBack,
  onViewActivity,
}: Props) {
  const validateBeforePrepare = () => {
    if (!draft.racket || !draft.availability || !draft.stringProduct || !draft.stringProductId || !draft.selectedColor || !draft.selectedGauge) {
      onInvalidStep(1, "라켓 수량과 스트링 옵션을 다시 확인해주세요.");
      return false;
    }
    if (Object.keys(validateApplicant(draft.applicant)).length) {
      onInvalidStep(2, "신청자 정보를 다시 확인해주세요.");
      return false;
    }
    if (Object.keys(validateShipping(draft.collectionMethod, draft.shipping)).length) {
      onInvalidStep(3, "수령 방법과 배송지를 다시 확인해주세요.");
      return false;
    }
    const racketName = `${racketBrandLabel(draft.racket.brand)} ${draft.racket.model ?? ""}`.trim();
    if (Object.keys(validateWork(draft.collectionMethod, { racketType: racketName, ...draft.work })).length) {
      onInvalidStep(4, "장력·작업·방문예약 정보를 다시 확인해주세요.");
      return false;
    }
    return true;
  };

  return (
    <main className="min-h-dvh bg-white pb-[calc(32px+env(safe-area-inset-bottom))] text-[#191f28]">
      <section className="pt-[calc(16px+env(safe-area-inset-top))]">
        <Top title={<Top.TitleParagraph size={22}>라켓 구매</Top.TitleParagraph>} subtitleBottom={<Top.SubtitleParagraph size={17}>6 / 6 · Toss 로그인·결제</Top.SubtitleParagraph>} />
      </section>
      <div className="px-6 max-[359px]:px-5">
        <AppsPaymentCheckoutPanel
          paymentAttemptId={paymentAttemptId}
          onPaymentAttemptIdChange={onPaymentAttemptIdChange}
          validateBeforePrepare={validateBeforePrepare}
          preparePayment={(attemptId, sessionToken) =>
            prepareRacketPurchasePayment({
              sessionToken,
              attemptId,
              racketId: draft.racketId,
              stringProductId: draft.stringProductId,
              selectedColor: draft.selectedColor,
              selectedGauge: draft.selectedGauge,
              quantity: draft.quantity,
              applicant: draft.applicant,
              collectionMethod: draft.collectionMethod,
              shipping: draft.shipping,
              work: draft.work,
            })
          }
          onPaymentError={onPaymentError}
          onBack={onBack}
          onViewActivity={onViewActivity}
        />
      </div>
    </main>
  );
}
