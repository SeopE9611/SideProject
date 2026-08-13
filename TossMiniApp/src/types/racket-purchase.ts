import type { Product } from "./product";
import type { RacketAvailability, RacketDetail } from "./racket";
import type { StringingApplicantDraft, StringingCollectionMethod, StringingShippingDraft } from "./stringing";

export type RacketPurchaseWorkDraft = {
  tensionMain: string;
  tensionCross: string;
  note: string;
  preferredDate: string;
  preferredTime: string;
};

export type RacketPurchaseDraft = {
  racketId: string;
  racket: RacketDetail | null;
  availability: RacketAvailability | null;
  quantity: number;
  stringProductId: string;
  stringProduct: Product | null;
  selectedColor: string;
  selectedGauge: string;
  applicant: StringingApplicantDraft;
  collectionMethod: StringingCollectionMethod;
  shipping: StringingShippingDraft;
  work: RacketPurchaseWorkDraft;
};
