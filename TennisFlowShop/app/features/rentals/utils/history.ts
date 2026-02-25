import { Db, ObjectId } from 'mongodb';

type HistoryAction = 'paid' | 'out' | 'returned' | 'cancel-request' | 'cancel-approved' | 'cancel-rejected' | 'cancel-withdrawn';
type Actor = { role: 'user' | 'admin' | 'system'; id?: string };

export async function writeRentalHistory(
  db: Db,
  rentalId: string | ObjectId,
  params: {
    action: HistoryAction;
    from: string;
    to: string;
    actor?: Actor;
    snapshot?: Record<string, any>;
  }
) {
  const _id = typeof rentalId === 'string' ? new ObjectId(rentalId) : rentalId;
  await db.collection('rental_history').insertOne({
    rentalId: _id,
    ...params,
    at: new Date(),
  });
}
