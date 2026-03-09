import { verifyAccessToken, verifyOrderAccessToken } from '@/lib/auth.utils';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';

type AccessGateOptions = {
  allowGuestOrder: boolean;
  allowGuestRental: boolean;
};

export async function canAccessStringingApplicationById(id: string, options: AccessGateOptions) {
  if (!ObjectId.isValid(id)) {
    return { ok: false as const, response: Response.json({ error: 'Invalid application ID' }, { status: 400 }) };
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value ?? null;
  const orderAccessToken = cookieStore.get('orderAccessToken')?.value ?? null;

  const accessPayload = accessToken ? verifyAccessToken(accessToken) : null;
  const guestClaims = orderAccessToken ? verifyOrderAccessToken(orderAccessToken) : null;

  if (!accessPayload && !guestClaims) {
    return { ok: false as const, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const db = await getDb();

  let isAdmin = false;
  const requesterId = typeof accessPayload?.sub === 'string' ? accessPayload.sub : null;

  if (requesterId && ObjectId.isValid(requesterId)) {
    const me = await db.collection('users').findOne({ _id: new ObjectId(requesterId) }, { projection: { role: 1 } });
    if (!me) {
      return { ok: false as const, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
    }
    isAdmin = me.role === 'admin';
  } else if (accessPayload) {
    return { ok: false as const, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const application = await db
    .collection('stringing_applications')
    .findOne({ _id: new ObjectId(id) }, { projection: { _id: 1, userId: 1, orderId: 1, rentalId: 1 } });

  if (!application) {
    return { ok: false as const, response: Response.json({ error: 'Application not found' }, { status: 404 }) };
  }

  const isMemberOwner = !!requesterId && !!(application as any).userId && String((application as any).userId) === requesterId;
  const guestOrderId = typeof (guestClaims as any)?.orderId === 'string' ? (guestClaims as any).orderId : null;
  const guestRentalId = typeof (guestClaims as any)?.rentalId === 'string' ? (guestClaims as any).rentalId : null;

  const isGuestOrderOwner =
    options.allowGuestOrder && !!guestOrderId && !!(application as any).orderId && String((application as any).orderId) === guestOrderId;
  const isGuestRentalOwner =
    options.allowGuestRental && !!guestRentalId && !!(application as any).rentalId && String((application as any).rentalId) === guestRentalId;

  if (!isAdmin && !isMemberOwner && !isGuestOrderOwner && !isGuestRentalOwner) {
    return { ok: false as const, response: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true as const };
}
