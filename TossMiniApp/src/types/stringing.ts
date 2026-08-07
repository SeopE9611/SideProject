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
