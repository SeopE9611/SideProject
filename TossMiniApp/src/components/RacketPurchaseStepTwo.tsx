import { Top } from "@toss/tds-mobile";
import { useState } from "react";

import { validateApplicant } from "../lib/stringing-application-validation";
import type { StringingApplicantDraft } from "../types/stringing";
import ApplicantFields from "./ApplicantFields";

type Props = {
  applicant: StringingApplicantDraft;
  errorMessage?: string;
  onApplicantChange: (applicant: StringingApplicantDraft) => void;
  onBack: () => void;
  onContinue: () => void;
};

export default function RacketPurchaseStepTwo({
  applicant,
  errorMessage = "",
  onApplicantChange,
  onBack,
  onContinue,
}: Props) {
  const [validationRequest, setValidationRequest] = useState(0);

  const handleContinue = () => {
    setValidationRequest((current) => current + 1);
    if (Object.keys(validateApplicant(applicant)).length) return;
    onContinue();
  };

  return (
    <main className="min-h-dvh bg-white pb-[calc(32px+env(safe-area-inset-bottom))] text-[#191f28]">
      <section className="pt-[calc(16px+env(safe-area-inset-top))]">
        <Top title={<Top.TitleParagraph size={22}>라켓 구매</Top.TitleParagraph>} subtitleBottom={<Top.SubtitleParagraph size={17}>2 / 6 · 신청자 정보</Top.SubtitleParagraph>} />
      </section>
      <section className="px-6 max-[359px]:px-5">
        <p className="mb-1.5 text-xs font-extrabold tracking-[0.08em] text-[#688d00]">STEP 02</p>
        <h1 className="m-0 text-[22px] font-extrabold">신청자 정보</h1>
        <p className="mt-2 mb-4 text-sm leading-6 text-[#6b7684]">주문과 작업 진행 안내에 사용할 정보를 입력해주세요.</p>
        {errorMessage ? <p role="alert" className="rounded-2xl bg-[#fff4f2] p-4 text-sm font-semibold text-[#d92d20]">{errorMessage}</p> : null}
        <ApplicantFields applicant={applicant} onChange={onApplicantChange} validationRequest={validationRequest} />
        <div className="mt-6 grid grid-cols-[0.72fr_1.28fr] gap-2.5">
          <button type="button" className="min-h-[52px] rounded-2xl border border-[#d1d6db] bg-white font-bold" onClick={onBack}>이전</button>
          <button type="button" className="min-h-[52px] rounded-2xl bg-[#191f28] font-extrabold text-white" onClick={handleContinue}>다음: 수령 방법</button>
        </div>
      </section>
    </main>
  );
}
