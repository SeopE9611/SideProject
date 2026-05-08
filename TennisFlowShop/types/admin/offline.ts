export type OfflineKind = "stringing" | "package_sale" | "etc";
export type OfflineStatus = "received" | "in_progress" | "completed" | "picked_up" | "canceled";
export type OfflinePaymentStatus = "pending" | "paid" | "refunded";
export type OfflinePaymentMethod = "cash" | "card" | "bank_transfer" | "etc";

export type OfflineLinkedUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  phoneMasked?: string | null;
  pointsBalance?: number | null;
};

export type OfflineRecordPoints = {
  earn?: number | null;
  use?: number | null;
  grantTxId?: string | null;
  deductTxId?: string | null;
};

export type OfflineRecordPackageUsage = {
  passId?: string | null;
  usedCount?: number | null;
  consumptionId?: string | null;
};

export type OfflineServicePassSummary = {
  id: string;
  name?: string | null;
  packageName?: string | null;
  status?: string | null;
  totalCount?: number | null;
  usedCount?: number | null;
  remainingCount?: number | null;
  expiresAt?: string | null;
  createdAt?: string | null;
};

export type OfflinePackageSaleSummary = {
  id: string;
  packageName?: string | null;
  sessions?: number | null;
  price?: number | null;
  paymentMethod?: OfflinePaymentMethod | string | null;
  paymentStatus?: string | null;
  paidAt?: string | null;
  createdAt?: string | null;
  source?: string | null;
};

export type OfflineLinkCandidate = OfflineLinkedUser & {
  match: {
    name: boolean;
    phone: boolean;
    email: boolean;
  };
  alreadyLinkedOfflineCustomerId?: string | null;
};

export interface OfflineCustomerDto {
  id: string;
  linkedUserId?: string | null;
  name: string;
  phone: string;
  phoneMasked?: string;
  email?: string | null;
  memo?: string;
  tags?: string[];
  source: "offline_admin";
  stats?: { visitCount: number; totalPaid: number; totalServiceCount: number; lastVisitedAt?: string };
  createdAt?: string;
  updatedAt?: string;
}
