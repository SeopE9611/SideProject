import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const client = await clientPromise;
  const db = client.db();
  const id = params.id;

  try {
    const app = await db.collection('stringing_applications').findOne({ _id: new ObjectId(id) });

    if (!app) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: app._id.toString(),
      orderId: app.orderId?.toString() || null,
      customer: app.userSnapshot ? { name: app.userSnapshot.name, email: app.userSnapshot.email } : { name: app.guestName, email: app.guestEmail },
      requestedAt: app.createdAt,
      desiredDateTime: app.desiredDateTime,
      stringType: app.stringType,
      status: app.status,
      paymentStatus: app.paymentStatus,
      shippingInfo: app.shippingInfo || null,
      memo: app.memo || '',
      photos: app.photos || [],
      stringDetails: app.stringDetails || null,
    });
  } catch (error) {
    console.error('[GET stringing_application] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const client = await clientPromise;
  const db = client.db();
  const id = params.id;

  try {
    const { status, memo, photoUrls } = await req.json();

    const result = await db.collection('stringing_applications').updateOne({ _id: new ObjectId(id) }, { $set: { status, memo, photos: photoUrls } });

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: 'Update failed' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PATCH stringing_application] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
