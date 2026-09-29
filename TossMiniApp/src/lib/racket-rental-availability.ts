import type { RacketAvailability, RacketDetail } from "../types/racket";
import type { RentalDays } from "../types/racket-rental";

export type RacketRentalAvailabilityReason = "available" | "rental_disabled" | "no_inventory" | "invalid_deposit" | "invalid_fee" | "sold";

export function getRacketRentalAvailability(racket: Pick<RacketDetail, "status" | "rental">, availability: Pick<RacketAvailability, "available">, days?: RentalDays | null): RacketRentalAvailabilityReason {
  if (racket.status === "sold") return "sold";
  if (racket.rental?.enabled !== true) return "rental_disabled";
  if (availability.available < 1) return "no_inventory";
  if (!Number.isInteger(racket.rental.deposit) || Number(racket.rental.deposit) < 0) return "invalid_deposit";
  const fees = days ? [racket.rental.fee?.[`d${days}` as "d7" | "d15" | "d30"]] : [racket.rental.fee?.d7, racket.rental.fee?.d15, racket.rental.fee?.d30];
  if (!fees.some((fee) => Number.isInteger(fee) && Number(fee) >= 0)) return "invalid_fee";
  return "available";
}

export const RACKET_RENTAL_AVAILABILITY_MESSAGES: Record<Exclude<RacketRentalAvailabilityReason, "available">, string> = {
  rental_disabled: "현재 대여 운영이 중지된 라켓입니다.", no_inventory: "현재 대여 가능한 재고가 없습니다.", invalid_deposit: "보증금 정보를 확인할 수 없습니다.", invalid_fee: "선택한 기간의 대여 요금을 확인할 수 없습니다.", sold: "판매 완료되어 대여할 수 없는 라켓입니다.",
};

export type RacketRentalStepChecks = {
  rentalAvailable: boolean; daysValid: boolean; stringSelectionValid: boolean;
  applicantValid: boolean; shippingValid: boolean; workValid: boolean; refundAccountValid: boolean;
};
export function getAllowedRacketRentalStep(checks: RacketRentalStepChecks): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  if (!checks.rentalAvailable || !checks.daysValid) return 1;
  if (!checks.stringSelectionValid) return 2;
  if (!checks.applicantValid) return 3;
  if (!checks.shippingValid) return 4;
  if (!checks.workValid) return 5;
  if (!checks.refundAccountValid) return 6;
  return 7;
}
