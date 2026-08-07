export type StringingSlotSummary = {
  closed: boolean;
  date: string;
  capacity: number;
  allTimes: string[];
  reservedTimes: string[];
  blockedTimes: string[];
  availableTimes: string[];
};

export type StringingStartSelection = {
  productId: string;
  selectedColor: string;
  selectedGauge: string;
};

export type StringingApplicantDraft = {
  name: string;
  email: string;
  phone: string;
};

export type StringingCollectionMethod = "self_ship" | "courier_pickup" | "visit";

export type StringingShippingDraft = {
  postalCode: string;
  address: string;
  addressDetail: string;
};

export type StringingWorkDraft = {
  racketType: string;
  tensionMain: string;
  tensionCross: string;
  note: string;
  preferredDate: string;
  preferredTime: string;
};

export type StringingApplicationDraft = {
  applicant: StringingApplicantDraft;
  collectionMethod: StringingCollectionMethod;
  shipping: StringingShippingDraft;
  work: StringingWorkDraft;
};
