import { proxyToLegacyAdminRoute } from '@/lib/admin-route-proxy';

export async function GET(req: Request) {
  return proxyToLegacyAdminRoute(req, '/api/settlements/live', 'GET');
}
