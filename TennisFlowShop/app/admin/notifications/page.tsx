import { redirect } from 'next/navigation';

type SP = Record<string, string | string[] | undefined>;

export default async function AdminNotificationsPage({ searchParams }: { searchParams?: Promise<SP> }) {
  const params = await Promise.resolve(searchParams ?? {}); //
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (typeof v === 'string') sp.set(k, v);
    else if (Array.isArray(v)) v.forEach((vv) => vv != null && sp.append(k, vv));
  }
  const qs = sp.toString();
  redirect(qs ? `/admin/notifications/outbox?${qs}` : '/admin/notifications/outbox');
}
