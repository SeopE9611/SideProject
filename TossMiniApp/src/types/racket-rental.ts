import type { Product } from "./product";
import type { RacketAvailability, RacketDetail } from "./racket";
import type { StringingApplicantDraft, StringingCollectionMethod, StringingShippingDraft } from "./stringing";

export type RentalDays = 7 | 15 | 30;
export type RefundAccountDraft = { bank: string; account: string; holder: string };
export type RacketRentalWorkDraft = { tensionMain: string; tensionCross: string; note: string; preferredDate: string; preferredTime: string };
export type RacketRentalDraft = {
  racketId: string; racket: RacketDetail | null; availability: RacketAvailability | null; days: RentalDays | null;
  stringingRequested: boolean; stringProductId: string; stringProduct: Product | null; selectedColor: string; selectedGauge: string;
  applicant: StringingApplicantDraft; collectionMethod: StringingCollectionMethod; shipping: StringingShippingDraft;
  work: RacketRentalWorkDraft; refundAccount: RefundAccountDraft;
};
