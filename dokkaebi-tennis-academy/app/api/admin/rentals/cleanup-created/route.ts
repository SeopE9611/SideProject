import { proxyToLegacyAdminRoute } from '@/lib/admin-route-proxy';

export async function POST(req: Request) {
  return proxyToLegacyAdminRoute(req, '/api/rentals/cleanup-created', 'POST');
}
