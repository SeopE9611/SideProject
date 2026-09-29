import type { RacketRentalDraft, RefundAccountDraft } from "../types/racket-rental";
import { REFUND_BANKS } from "./refund-banks";
import { getAllowedRacketRentalStep, getRacketRentalAvailability } from "./racket-rental-availability";
import { validateApplicant, validateShipping, validateWork } from "./stringing-application-validation";

export function validateRefundAccount(value: RefundAccountDraft) { const errors: Partial<Record<keyof RefundAccountDraft, string>> = {}; if (!REFUND_BANKS.some(([code]) => code === value.bank)) errors.bank = "환급 은행을 선택해주세요."; if (!/^\d{8,20}$/.test(value.account)) errors.account = "계좌번호는 숫자 8~20자로 입력해주세요."; const holder = value.holder.trim(); if (holder.length < 2 || holder.length > 30) errors.holder = "예금주명은 2~30자로 입력해주세요."; return errors; }

export function getAllowedStepForRentalDraft(draft: RacketRentalDraft) {
  const rentalAvailable = Boolean(draft.racket && draft.availability && getRacketRentalAvailability(draft.racket, draft.availability, draft.days) === "available");
  const work = { racketType: "대여 라켓", ...draft.work };
  return getAllowedRacketRentalStep({
    rentalAvailable, daysValid: draft.days !== null,
    stringSelectionValid: !draft.stringingRequested || Boolean(draft.stringProduct && draft.stringProductId === draft.stringProduct._id && draft.selectedColor.trim() && draft.selectedGauge.trim()),
    applicantValid: Object.keys(validateApplicant(draft.applicant)).length === 0,
    shippingValid: Object.keys(validateShipping(draft.collectionMethod, draft.shipping)).length === 0,
    workValid: !draft.stringingRequested || Object.keys(validateWork(draft.collectionMethod, work)).length === 0,
    refundAccountValid: Object.keys(validateRefundAccount(draft.refundAccount)).length === 0,
  });
}
