export type SettlementTotals = {
  paid: number;
  refund: number;
  net: number;
  rentalDeposit?: number;
};

export type SettlementBreakdown = {
  orders: number;
  applications: number;
  packages: number;
  rentals?: number;
};

export type SettlementSnapshot = {
  yyyymm: string;
  totals: SettlementTotals;
  breakdown: SettlementBreakdown;
  createdAt?: string;
  lastGeneratedAt?: string;
};

export type SettlementLiveResponse = {
  range: { from: string; to: string };
  totals: SettlementTotals;
  breakdown: Required<SettlementBreakdown>;
};

export type SettlementDiffMetrics = { paid: number; refund: number; net: number; orders: number; applications: number; packages: number };

export type SettlementDiff = {
  live: SettlementDiffMetrics;
  snap: SettlementDiffMetrics;
};
