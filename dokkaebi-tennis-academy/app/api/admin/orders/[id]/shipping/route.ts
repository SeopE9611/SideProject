import { proxyToLegacyAdminRoute } from '@/lib/admin-route-proxy';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToLegacyAdminRoute(req, `/api/orders/${id}/shipping`, 'PATCH');
}
