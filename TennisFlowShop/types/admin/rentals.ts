export type AdminRentalPaymentFilter = 'all' | 'unpaid' | 'paid';
export type AdminRentalShippingFilter = 'all' | 'none' | 'outbound-set' | 'return-set' | 'both-set';

export interface AdminRentalsListRequestDto {
  page: number;
  pageSize: number;
  pay: AdminRentalPaymentFilter;
  ship: AdminRentalShippingFilter;
  status: string;
  brand: string;
  from: string;
  to: string;
  sort: string;
}

export interface AdminRentalListItemDto {
  id?: string;
  racketId?: string;
  brand: string;
  model: string;
  status: string;
  days: number;
  amount: {
    fee: number;
    deposit: number;
    stringPrice: number;
    stringingFee: number;
    total: number;
  };
  createdAt: string | Date | null;
  outAt: string | Date | null;
  dueAt: string | Date | null;
  returnedAt: string | Date | null;
  depositRefundedAt: string | Date | null;
  stringingApplicationId: string | null;
  withStringService: boolean;
  paymentStatusLabel: '결제완료' | '결제대기';
  paymentStatusSource: 'explicit' | 'derived';
  shipping: {
    outbound: { courier: string; trackingNumber: string; shippedAt: string | Date | null } | null;
    return: { courier: string; trackingNumber: string; shippedAt: string | Date | null } | null;
  };
  cancelRequest: { status: 'requested' | 'approved' | 'rejected' } | null;
  customer: {
    name: string;
    email: string;
  };
}

export interface AdminRentalsListResponseDto {
  page: number;
  pageSize: number;
  total: number;
  items: AdminRentalListItemDto[];
}
