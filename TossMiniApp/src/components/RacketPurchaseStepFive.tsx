import { Top } from "@toss/tds-mobile";
import type { ReactNode } from "react";

import { formatGaugeLabel, getStringColorLabel } from "../lib/product-labels";
import { racketBrandLabel } from "../lib/racket-labels";
import type { RacketPurchaseDraft } from "../types/racket-purchase";

type Props = {
  draft: RacketPurchaseDraft;
  errorMessage?: string;
  onEdit: (step: 1 | 2 | 3 | 4) => void;
  onBack: () => void;
  onContinue: () => void;
};

function ReviewSection({ title, step, onEdit, children }: { title: string; step: 1 | 2 | 3 | 4; onEdit: (step: 1 | 2 | 3 | 4) => void; children: ReactNode }) {
  return (
    <section className="rounded-[20px] border border-[#e5e8eb] p-[18px]">
      <div className="flex items-center justify-between gap-3"><strong>{title}</strong><button type="button" className="border-0 bg-transparent p-1 text-sm font-bold text-[#688d00]" onClick={() => onEdit(step)}>수정</button></div>
      <dl className="mt-4 grid grid-cols-[84px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">{children}</dl>
    </section>
  );
}

export default function RacketPurchaseStepFive({ draft, errorMessage = "", onEdit, onBack, onContinue }: Props) {
  const racketName = `${racketBrandLabel(draft.racket?.brand)} ${draft.racket?.model ?? ""}`.trim();
  const collectionLabel = draft.collectionMethod === "visit" ? "매장 방문 수령" : "택배 배송";
  const address = [draft.shipping.postalCode, draft.shipping.address, draft.shipping.addressDetail].filter(Boolean).join(" ");

  return (
    <main className="min-h-dvh bg-white pb-[calc(32px+env(safe-area-inset-bottom))] text-[#191f28]">
      <section className="pt-[calc(16px+env(safe-area-inset-top))]">
        <Top title={<Top.TitleParagraph size={22}>라켓 구매</Top.TitleParagraph>} subtitleBottom={<Top.SubtitleParagraph size={17}>5 / 6 · 최종 구성 확인</Top.SubtitleParagraph>} />
      </section>
      <section className="px-6 max-[359px]:px-5">
        <h1 className="m-0 text-[22px] font-extrabold">최종 구성 확인</h1>
        <p className="mt-2 mb-4 text-sm leading-6 text-[#6b7684]">구매할 라켓과 장착 정보를 확인해주세요.</p>
        {errorMessage ? <p role="alert" className="rounded-2xl bg-[#fff4f2] p-4 text-sm font-semibold text-[#d92d20]">{errorMessage}</p> : null}
        <div className="flex flex-col gap-3">
          <ReviewSection title="라켓·스트링" step={1} onEdit={onEdit}>
            <dt className="text-[#8b95a1]">라켓</dt><dd className="m-0">{racketName}</dd>
            <dt className="text-[#8b95a1]">수량</dt><dd className="m-0">{draft.quantity}개</dd>
            <dt className="text-[#8b95a1]">스트링</dt><dd className="m-0">{draft.stringProduct?.name ?? "선택 확인 필요"}</dd>
            <dt className="text-[#8b95a1]">색상</dt><dd className="m-0">{getStringColorLabel(draft.selectedColor)}</dd>
            <dt className="text-[#8b95a1]">게이지</dt><dd className="m-0">{formatGaugeLabel(draft.selectedGauge)}</dd>
          </ReviewSection>
          <ReviewSection title="신청자" step={2} onEdit={onEdit}>
            <dt className="text-[#8b95a1]">이름</dt><dd className="m-0 break-all">{draft.applicant.name}</dd>
            <dt className="text-[#8b95a1]">연락처</dt><dd className="m-0 break-all">{draft.applicant.phone}</dd>
            <dt className="text-[#8b95a1]">이메일</dt><dd className="m-0 break-all">{draft.applicant.email}</dd>
          </ReviewSection>
          <ReviewSection title="수령 방법" step={3} onEdit={onEdit}>
            <dt className="text-[#8b95a1]">방법</dt><dd className="m-0">{collectionLabel}</dd>
            {draft.collectionMethod === "self_ship" ? <><dt className="text-[#8b95a1]">배송지</dt><dd className="m-0 break-words">{address}</dd></> : <><dt className="text-[#8b95a1]">방문 일시</dt><dd className="m-0">{draft.work.preferredDate} {draft.work.preferredTime}</dd></>}
          </ReviewSection>
          <ReviewSection title="장력·작업 요청" step={4} onEdit={onEdit}>
            <dt className="text-[#8b95a1]">메인 장력</dt><dd className="m-0">{draft.work.tensionMain}LB</dd>
            <dt className="text-[#8b95a1]">크로스 장력</dt><dd className="m-0">{draft.work.tensionCross}LB</dd>
            <dt className="text-[#8b95a1]">요청사항</dt><dd className="m-0 whitespace-pre-line break-words">{draft.work.note || "없음"}</dd>
          </ReviewSection>
        </div>
        <p className="mt-4 rounded-2xl bg-[#f2f4f6] p-4 text-sm leading-6 text-[#6b7684]">최종 결제금액은 다음 단계에서 서버의 현재 가격·재고·패키지 정보를 다시 확인한 뒤 확정됩니다.</p>
        <div className="mt-6 grid grid-cols-[0.72fr_1.28fr] gap-2.5"><button type="button" className="min-h-[52px] rounded-2xl border border-[#d1d6db] bg-white font-bold" onClick={onBack}>이전</button><button type="button" className="min-h-[52px] rounded-2xl bg-[#191f28] font-extrabold text-white" onClick={onContinue}>다음: 결제</button></div>
      </section>
    </main>
  );
}
