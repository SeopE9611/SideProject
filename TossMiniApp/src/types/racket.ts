export type RacketRental = {
  enabled?: boolean;
  deposit?: number;
  fee?: { d7?: number; d15?: number; d30?: number };
  disabledReason?: string;
};

export type RacketMarketing = {
  isFeatured: boolean;
  isNew: boolean;
  isSale: boolean;
  salePrice: number;
};

export type RacketSpec = {
  weight?: number | null;
  balance?: number | null;
  headSize?: number | null;
  pattern?: string | null;
  gripSize?: string | null;
  lengthIn?: number | null;
  swingWeight?: number | null;
  stiffnessRa?: number | null;
};

export type RacketListItem = {
  id: string;
  brand?: string;
  model?: string;
  price?: number;
  condition?: string;
  images?: string[];
  status?: string;
  rental?: RacketRental;
  ratingAvg?: number;
  ratingAverage?: number;
  ratingCount?: number;
  reviewCount?: number;
  marketing?: RacketMarketing;
};

export type RacketsListResponse = { items: RacketListItem[]; total: number };

export type RacketDetail = RacketListItem & {
  year?: number | string | null;
  shippingFee?: number;
  quantity?: number;
  spec?: RacketSpec;
  reviewSummary?: { average?: number; count?: number };
};

export type RacketAvailability = {
  ok: boolean;
  count: number;
  quantity: number;
  available: number;
};
