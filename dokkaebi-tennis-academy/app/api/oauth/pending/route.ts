import { NextRequest, NextResponse } from 'next/server';
import type { Collection } from 'mongodb';
import { getDb } from '@/lib/mongodb';

type PendingDoc = {
  _id: string;
  provider: 'kakao' | 'naver';
  oauthId: string | null;
  email: string;
  name: string;
  from: string | null;
  createdAt: Date;
  expiresAt: Date;
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'token is required' }, { status: 400 });
  }

  const db = await getDb();
  const pendings = db.collection('oauth_pending_signups') as Collection<PendingDoc>;
  const doc = await pendings.findOne({ _id: token });

  if (!doc) {
    return NextResponse.json({ error: 'pending signup not found (expired or invalid)' }, { status: 404 });
  }

  return NextResponse.json({
    provider: doc.provider,
    email: doc.email,
    name: doc.name,
    from: doc.from,
  });
}
