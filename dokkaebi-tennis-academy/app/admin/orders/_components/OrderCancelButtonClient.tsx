'use client';

import { OrderCancelButton } from './OrderCancelButton';

export default function OrderCancelButtonClient({ orderId, alreadyCancelledReason }: { orderId: string; alreadyCancelledReason?: string | null }) {
  return <OrderCancelButton orderId={orderId} alreadyCancelledReason={alreadyCancelledReason} />;
}
