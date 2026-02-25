import { proxyToLegacyAdminRoute } from '@/lib/admin-route-proxy';

export async function GET(req: Request, { params }: { params: Promise<{ racketId: string }> }) {
  const { racketId } = await params;
  return proxyToLegacyAdminRoute(req, `/api/rentals/active-count/${racketId}`, 'GET');
}
