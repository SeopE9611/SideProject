import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { redirect } from 'next/navigation';
import MessageWriteClient from '@/app/messages/write/MessageWriteClient';

type SearchParams = { to?: string };

export default async function MessageWritePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const me = await getCurrentUser();
  if (!me) redirect('/login');

  const sp = await searchParams;
  const to = typeof sp?.to === 'string' ? sp.to : '';
  if (!ObjectId.isValid(to)) {
    return <MessageWriteClient me={me} toUser={null} />;
  }

  const db = await getDb();
  const u = await db.collection('users').findOne({ _id: new ObjectId(to), isDeleted: { $ne: true } }, { projection: { name: 1, role: 1 } });

  const toUser = u ? { id: u._id.toString(), name: (u as any).name ?? '회원', role: (u as any).role ?? 'user' } : null;

  return <MessageWriteClient me={me} toUser={toUser} />;
}
