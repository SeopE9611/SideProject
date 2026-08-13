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

export type StringingCollectionMethod = "self_ship" | "visit";

export type StringingShippingDraft = {
  postalCode: string;
  address: string;
  addressDetail: string;
  deliveryRequest?: string;
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

export type StringingCheckoutQuoteItem = {
  name: string;
  price: number;
  quantity: number;
  kind: "product" | "racket";
  mountingFee?: number;
  shippingFee?: number;
};

export type StringingCheckoutQuote = {
  success: true;
  subtotal: number;
  shippingFee: number;
  serviceFee: number;
  totalPrice: number;
  payableAmount: number;
  item: StringingCheckoutQuoteItem | null;
};
