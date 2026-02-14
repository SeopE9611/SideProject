import { proxyToLegacyAdminRoute } from '@/lib/admin-route-proxy';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToLegacyAdminRoute(req, `/api/package-orders/${id}/adjust-sessions`, 'POST');
}
