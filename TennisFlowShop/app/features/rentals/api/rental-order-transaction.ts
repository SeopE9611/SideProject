import type { ClientSession, Db, ObjectId } from "mongodb";

import type { VisibilityViewer } from "@/lib/public-visibility";
import { reservePaidRentalRacket } from "./paid-rental-availability";

export type RentalTransactionExtensionResult = {
  stringingApplicationId?: string | null;
  stringingSubmitted?: boolean;
};

export function rentalReservationVisibilityViewer(status: string, viewer?: VisibilityViewer) {
  return status === "paid" ? { isAdmin: false } : viewer;
}

/**
 * 이미 열린 MongoDB transaction에서만 대여 주문의 공통 write set을 수행한다.
 * session을 생성하거나 transaction을 시작/종료하지 않으므로 결제 finalization에서도
 * 중첩 transaction 없이 같은 라켓 예약 및 rental_orders insert 규칙을 재사용할 수 있다.
 */
export async function createRentalOrderInTransaction(params: {
  db: Db;
  session: ClientSession;
  rentalId: ObjectId;
  racketId: ObjectId;
  rentalDocument: Record<string, unknown>;
  idemKey?: string;
  reservePaidRental: boolean;
  visibilityViewer?: VisibilityViewer;
  beforeInsert?: () => Promise<void>;
  afterInsert?: (rentalId: ObjectId) => Promise<RentalTransactionExtensionResult | void>;
}) {
  if (params.reservePaidRental) {
    await reservePaidRentalRacket({
      db: params.db,
      session: params.session,
      racketId: params.racketId,
      visibilityViewer: params.visibilityViewer ?? { isAdmin: false },
    });
  }

  await params.beforeInsert?.();

  await params.db.collection("rental_orders").insertOne(
    {
      _id: params.rentalId,
      ...params.rentalDocument,
      ...(params.idemKey ? { idemKey: params.idemKey } : {}),
    },
    { session: params.session },
  );

  const extension = await params.afterInsert?.(params.rentalId);
  return {
    rentalId: params.rentalId,
    stringingApplicationId: extension?.stringingApplicationId ?? null,
    stringingSubmitted: extension?.stringingSubmitted === true,
  };
}
